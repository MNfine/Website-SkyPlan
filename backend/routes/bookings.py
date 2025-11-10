from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app
from backend.models.db import session_scope
from backend.models.user import User
from backend.models.passenger import Passenger
from backend.models.booking import Booking, BookingPassenger, BookingStatus, TripType, FareClass
from backend.models.flights import Flight

bookings_bp = Blueprint('bookings', __name__)


def _get_user_id_from_bearer() -> int | None:
	auth_header = request.headers.get('Authorization')
	if not auth_header or not auth_header.startswith('Bearer '):
		return None
	token = auth_header.split(' ')[1]
	return User.verify_auth_token(token)


@bookings_bp.route('/passenger', methods=['POST'])
def create_or_update_passenger():
	"""Create a passenger profile for the logged-in user (or update if exists).

	Request JSON fields (from passenger form):
	lastname, firstname, cccd, dob (MM/DD/YYYY), gender, phoneNumber, email,
	address, city (or customCity when city == 'Khác'), nationality (or customNationality), notes
	"""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized'
		}), 401

	data = request.get_json(silent=True) or {}

	# Basic required field validation
	required = ['lastname', 'firstname', 'cccd', 'dob', 'gender', 'phoneNumber', 'email', 'address', 'city', 'nationality']
	missing = [f for f in required if not str(data.get(f, '')).strip()]
	if missing:
		return jsonify({'success': False, 'message': f'Missing fields: {", ".join(missing)}'}), 400

	# Parse DOB from MM/DD/YYYY
	try:
		dob_dt = datetime.strptime(data['dob'], '%m/%d/%Y').date()
	except Exception:
		return jsonify({'success': False, 'message': 'Invalid dob format, expected MM/DD/YYYY'}), 400

	# Resolve city/nationality when "Khác"
	city = data.get('city')
	if city == 'Khác':
		city = (data.get('customCity') or '').strip()
	nationality = data.get('nationality')
	if nationality == 'Khác':
		nationality = (data.get('customNationality') or '').strip()

	# Upsert per (user_id, cccd)
	with session_scope() as session:
		passenger = session.query(Passenger).filter_by(user_id=user_id, cccd=data['cccd']).first()
		if not passenger:
			passenger = Passenger(user_id=user_id)

		passenger.lastname = data['lastname'].strip()
		passenger.firstname = data['firstname'].strip()
		passenger.cccd = data['cccd'].strip()
		passenger.dob = dob_dt
		passenger.gender = data['gender']
		passenger.phone_number = data['phoneNumber'].strip()
		passenger.email = data['email'].strip()
		passenger.address = data['address'].strip()
		passenger.city = city
		passenger.nationality = nationality
		passenger.notes = (data.get('notes') or '').strip() or None

		session.add(passenger)
		session.flush()

		return jsonify({'success': True, 'passenger': passenger.as_dict()}), 201


@bookings_bp.route('/create', methods=['POST'])
def create_booking():
	"""Create a new booking with flight details and passenger information.
	Supports both authenticated users and guest bookings.
	
	Request JSON fields:
	- outbound_flight_id: ID of the outbound flight
	- inbound_flight_id: ID of the return flight (optional for one-way trips)
	- trip_type: "ROUND_TRIP" or "ONE_WAY"
	- fare_class: "ECONOMY", "PREMIUM", or "BUSINESS"
	- passengers: List of passenger IDs OR passenger data for guest booking
	- total_amount: Total booking amount
	- guest_passenger: Passenger data for guest booking (if no auth)
	"""
	print("🔍 Booking create endpoint hit!")
	import sys
	sys.stdout.flush()
	user_id = _get_user_id_from_bearer()  # Optional for guest booking
	print(f"🔍 User ID from token: {user_id}")
	sys.stdout.flush()

	data = request.get_json(silent=True) or {}

	# Validate required fields - different for guest vs authenticated booking
	if user_id:
		# Authenticated booking - require passenger IDs
		required = ['outbound_flight_id', 'trip_type', 'fare_class', 'passengers', 'total_amount']
		missing = [f for f in required if f not in data]
		if missing:
			return jsonify({'success': False, 'message': f'Missing fields: {", ".join(missing)}'}), 400
		passenger_ids = [int(pid) for pid in data['passengers']]
	else:
		# Guest booking - require passenger data
		required = ['outbound_flight_id', 'trip_type', 'fare_class', 'guest_passenger', 'total_amount']
		missing = [f for f in required if f not in data]
		if missing:
			return jsonify({'success': False, 'message': f'Missing fields for guest booking: {", ".join(missing)}'}), 400
		guest_passenger_data = data['guest_passenger']
		passenger_ids = None

	try:
		outbound_flight_id = int(data['outbound_flight_id'])
		inbound_flight_id = int(data['inbound_flight_id']) if data.get('inbound_flight_id') else None
		trip_type = TripType(data['trip_type'])
		fare_class = FareClass(data['fare_class'])
		total_amount = Decimal(str(data['total_amount']))
	except (ValueError, TypeError) as e:
		return jsonify({'success': False, 'message': f'Invalid data format: {str(e)}'}), 400

	# Validate trip type consistency
	if trip_type == TripType.ROUND_TRIP and not inbound_flight_id:
		return jsonify({'success': False, 'message': 'Return flight required for round trip'}), 400
	if trip_type == TripType.ONE_WAY and inbound_flight_id:
		return jsonify({'success': False, 'message': 'Return flight not allowed for one-way trip'}), 400

	with session_scope() as session:
		# Validate flights exist
		outbound_flight = session.query(Flight).get(outbound_flight_id)
		if not outbound_flight:
			return jsonify({'success': False, 'message': 'Outbound flight not found'}), 404

		inbound_flight = None
		if inbound_flight_id:
			inbound_flight = session.query(Flight).get(inbound_flight_id)
			if not inbound_flight:
				return jsonify({'success': False, 'message': 'Return flight not found'}), 404

		# Handle passengers - different for authenticated vs guest
		passengers = []
		if user_id:
			# Authenticated booking - validate existing passengers
			passengers = session.query(Passenger).filter(
				Passenger.id.in_(passenger_ids),
				Passenger.user_id == user_id
			).all()

			if len(passengers) != len(passenger_ids):
				return jsonify({'success': False, 'message': 'Some passengers not found or not owned by user'}), 404
		else:
			# Guest booking - create passenger on the fly
			try:
				print(f"🔍 Debug guest_passenger_data: {guest_passenger_data}")
				
				# Parse date safely
				dob_value = None
				if guest_passenger_data.get('dob'):
					try:
						dob_value = datetime.strptime(guest_passenger_data.get('dob'), '%Y-%m-%d').date()
					except ValueError:
						print(f"❌ Invalid date format: {guest_passenger_data.get('dob')}")
						return jsonify({'success': False, 'message': f'Invalid date format: {guest_passenger_data.get("dob")}'}), 400
				
				guest_passenger = Passenger(
					user_id=None,  # Guest passenger
					lastname=guest_passenger_data.get('lastname', ''),
					firstname=guest_passenger_data.get('firstname', ''),
					cccd=guest_passenger_data.get('cccd', ''),
					dob=dob_value,
					gender=guest_passenger_data.get('gender', ''),
					phone_number=guest_passenger_data.get('phone_number', ''),
					email=guest_passenger_data.get('email', ''),
					address=guest_passenger_data.get('address', ''),
					city=guest_passenger_data.get('city', ''),
					nationality=guest_passenger_data.get('nationality', ''),
					notes=guest_passenger_data.get('notes', '')
				)
				session.add(guest_passenger)
				session.flush()  # Get passenger ID
				passengers = [guest_passenger]
				print(f"✅ Created guest passenger with ID: {guest_passenger.id}")
			except Exception as e:
				print(f"❌ Error creating guest passenger: {str(e)}")
				import traceback
				traceback.print_exc()
				return jsonify({'success': False, 'message': f'Failed to create guest passenger: {str(e)}'}), 400

		# Create booking
		booking = Booking(
			booking_code=Booking.generate_booking_code(),
			user_id=user_id,  # Can be None for guest booking
			status=BookingStatus.PENDING,
			trip_type=trip_type,
			fare_class=fare_class,
			outbound_flight_id=outbound_flight_id,
			inbound_flight_id=inbound_flight_id,
			total_amount=total_amount
		)
		session.add(booking)
		session.flush()  # Get booking ID

		# Create booking-passenger relationships
		for passenger in passengers:
			booking_passenger = BookingPassenger(
				booking_id=booking.id,
				passenger_id=passenger.id
			)
			session.add(booking_passenger)

		session.flush()
		return jsonify({
			'success': True, 
			'booking': booking.as_dict(),
			'booking_code': booking.booking_code
		}), 201


@bookings_bp.route('/<booking_code>', methods=['GET'])
def get_booking(booking_code):
	"""Get booking details by booking code."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized'
		}), 401

	with session_scope() as session:
		booking = session.query(Booking).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		return jsonify({
			'success': True,
			'booking': booking.as_dict()
		}), 200


@bookings_bp.route('/', methods=['GET'])
def list_user_bookings():
	"""List all bookings for the authenticated user."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized'
		}), 401

	with session_scope() as session:
		bookings = session.query(Booking).filter_by(user_id=user_id).order_by(Booking.created_at.desc()).all()

		return jsonify({
			'success': True,
			'bookings': [booking.as_dict() for booking in bookings]
		}), 200


@bookings_bp.route('/<booking_code>/cancel', methods=['PATCH'])
def cancel_booking(booking_code):
	"""Cancel a booking by booking code."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized'
		}), 401

	with session_scope() as session:
		booking = session.query(Booking).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# Chỉ có thể cancel booking ở trạng thái PENDING hoặc PAYMENT_FAILED
		if booking.status not in [BookingStatus.PENDING, BookingStatus.PAYMENT_FAILED]:
			return jsonify({
				'success': False, 
				'message': f'Cannot cancel booking with status {booking.status.value}'
			}), 400

		# Update booking status
		booking.status = BookingStatus.CANCELLED

		session.flush()
		
		return jsonify({
			'success': True,
			'booking': booking.as_dict(),
			'message': 'Booking cancelled successfully'
		}), 200


@bookings_bp.route('/status/<booking_code>', methods=['GET'])
def get_booking_status(booking_code):
	"""Get booking details by booking code. Supports both authenticated and guest users."""
	user_id = _get_user_id_from_bearer()  # Optional - can be None for guest bookings

	with session_scope() as session:
		# Find the booking
		if user_id:
			# Authenticated user - verify ownership
			booking = session.query(Booking).filter_by(
				booking_code=booking_code,
				user_id=user_id
			).first()
		else:
			# Guest booking - only match by booking_code and ensure it's a guest booking
			booking = session.query(Booking).filter_by(
				booking_code=booking_code,
				user_id=None  # Guest booking has user_id=None
			).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		return jsonify({
			'success': True,
			'booking': booking.as_dict()
		}), 200
