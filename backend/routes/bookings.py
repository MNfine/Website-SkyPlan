from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app
from backend.models.db import session_scope
from backend.models.user import User
from backend.models.passenger import Passenger
from backend.models.booking import Booking, BookingPassenger, BookingStatus, TripType, FareClass
from sqlalchemy.orm import joinedload
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
	user_id = _get_user_id_from_bearer()  # Optional for guest booking

	try:
		data = request.get_json(silent=True) or {}

		# Transform old format (completeBookingData) to new format if needed
		# Old format has: trip, passenger, seats, extras, totalCost (or flights, passenger, seats, extras, totalCost)
		# New format has: outbound_flight_id, inbound_flight_id, trip_type, fare_class, total_amount
		if 'trip' in data or 'flights' in data or 'totalCost' in data:
			# Extract flight IDs - handle both 'trip' and 'flights' keys
			trip_data = data.get('trip') or data.get('flights') or {}
			if isinstance(trip_data, dict):
				# Try multiple possible field names for outbound flight
				if not data.get('outbound_flight_id'):
					data['outbound_flight_id'] = (
						trip_data.get('outboundFlightId') or 
						trip_data.get('outbound_flight_id') or 
						trip_data.get('flightId') or
						trip_data.get('id') or
						(data.get('outboundFlightId') if 'outboundFlightId' in data else None)
					)
				# Try multiple possible field names for inbound flight
				if not data.get('inbound_flight_id'):
					data['inbound_flight_id'] = (
						trip_data.get('inboundFlightId') or 
						trip_data.get('inbound_flight_id') or 
						trip_data.get('returnFlightId') or
						(data.get('inboundFlightId') if 'inboundFlightId' in data else None)
					)
				# Determine trip type
				if not data.get('trip_type'):
					if data.get('inbound_flight_id') or trip_data.get('returnDateISO') or trip_data.get('returnFlightId') or data.get('returnDateISO'):
						data['trip_type'] = 'round-trip'
					else:
						data['trip_type'] = 'one-way'
			elif isinstance(trip_data, (int, str)):
				# If trip/flights is just an ID
				if not data.get('outbound_flight_id'):
					data['outbound_flight_id'] = int(trip_data) if str(trip_data).isdigit() else None
			
			# Extract fare class from seats
			seats = data.get('seats') or {}
			if isinstance(seats, dict) and not data.get('fare_class'):
				fare_class_raw = seats.get('fareClass') or seats.get('fare_class') or 'economy'
				# Map to backend enum values
				if 'business' in fare_class_raw.lower():
					data['fare_class'] = 'business'
				elif 'premium' in fare_class_raw.lower():
					data['fare_class'] = 'premium-economy'
				else:
					data['fare_class'] = 'economy'
			
			# Extract total amount - try multiple possible field names
			if not data.get('total_amount'):
				data['total_amount'] = (
					data.get('totalCost') or 
					data.get('total_cost') or 
					data.get('totalAmount') or
					data.get('amount') or
					0
				)
			# Ensure total_amount is not 0 if totalCost exists
			if data.get('totalCost') and (not data.get('total_amount') or data.get('total_amount') == 0):
				data['total_amount'] = data['totalCost']
			
			# Extract passenger info
			passenger = data.get('passenger') or {}
			if isinstance(passenger, dict) and not data.get('guest_passenger') and not data.get('passengers'):
				# Transform passenger to guest_passenger format
				data['guest_passenger'] = {
					'lastname': passenger.get('lastname') or passenger.get('lastName') or '',
					'firstname': passenger.get('firstname') or passenger.get('firstName') or '',
					'cccd': passenger.get('cccd') or passenger.get('id_number') or '',
					'dob': passenger.get('dob') or passenger.get('date_of_birth') or '',
					'gender': passenger.get('gender') or passenger.get('sex') or '',
					'phone_number': passenger.get('phone_number') or passenger.get('phoneNumber') or passenger.get('phone') or '',
					'email': passenger.get('email') or passenger.get('email_address') or '',
					'address': passenger.get('address') or '',
					'city': passenger.get('city') or '',
					'nationality': passenger.get('nationality') or '',
					'notes': passenger.get('notes') or ''
				}

		# Validate required fields. Accept either explicit passenger IDs (passengers)
		# or guest_passenger data. If the client is authenticated they may still send
		# a guest_passenger payload (e.g., they entered passenger details but did not
		# select a stored passenger) — in that case create a passenger attached to
		# the authenticated user instead of rejecting the request.
		has_passengers = 'passengers' in data and data.get('passengers')
		has_guest = 'guest_passenger' in data and data.get('guest_passenger')

		# Basic common required fields
		base_required = ['outbound_flight_id', 'trip_type', 'fare_class', 'total_amount']
		missing_base = [f for f in base_required if f not in data]
		if missing_base:
			print(f"❌ Missing required fields: {missing_base}")
			return jsonify({'success': False, 'message': f'Missing fields: {", ".join(missing_base)}'}), 400

		# Ensure at least one passenger representation is present
		if not has_passengers and not has_guest:
			# If user is unauthenticated, encourage guest_passenger. If authenticated,
			# require either passengers or guest_passenger.
			print(f"❌ Missing passenger information. has_passengers={has_passengers}, has_guest={has_guest}")
			return jsonify({'success': False, 'message': 'Missing passenger information (passengers or guest_passenger required)'}), 400

		passenger_ids = [int(pid) for pid in data['passengers']] if has_passengers else None
		guest_passenger_data = data.get('guest_passenger') if has_guest else None
		outbound_flight_id = int(data['outbound_flight_id'])
		inbound_flight_id = int(data['inbound_flight_id']) if data.get('inbound_flight_id') else None
		trip_type = TripType(data['trip_type'])
		fare_class = FareClass(data['fare_class'])
		# Client-provided total (may be untrusted)
		# Try to get total_amount, fallback to totalCost if needed
		total_amount_raw = data.get('total_amount') or data.get('totalCost') or data.get('total_cost') or 0
		try:
			total_amount = Decimal(str(total_amount_raw))
		except Exception as e:
			print(f"⚠️ Failed to parse total_amount: {total_amount_raw}, error: {e}")
			total_amount = Decimal('0')

		# Validate trip type consistency
		if trip_type == TripType.ROUND_TRIP and not inbound_flight_id:
			return jsonify({'success': False, 'message': 'Return flight required for round trip'}), 400
		if trip_type == TripType.ONE_WAY and inbound_flight_id:
			return jsonify({'success': False, 'message': 'Return flight not allowed for one-way trip'}), 400

		# We'll open a DB session for the remainder of the create flow so all
		# DB writes (passenger creation, booking creation, booking-passenger
		# relationships) happen atomically and are committed.
		with session_scope() as session:
			# Validate flights exist inside the DB session
			outbound_flight = session.query(Flight).get(outbound_flight_id)
			if not outbound_flight:
				print(f"❌ Outbound flight {outbound_flight_id} not found")
				return jsonify({'success': False, 'message': 'Outbound flight not found'}), 404

			inbound_flight = None
			if inbound_flight_id:
				inbound_flight = session.query(Flight).get(inbound_flight_id)
				if not inbound_flight:
					print(f"❌ Return flight {inbound_flight_id} not found")
					return jsonify({'success': False, 'message': 'Return flight not found'}), 404

		# We'll collect passenger entries (id + optional seat info) so we can persist seat selections
		passenger_entries = []
		passengers = []

		# Extract seat information from request if available (from 'seats' field or 'selectedSeats')
		seats_data = data.get('seats') or data.get('selectedSeats') or []
		seat_map = {}  # Map passenger index to seat info
		if isinstance(seats_data, dict) and 'seats' in seats_data:
			seats_data = seats_data['seats']
		if isinstance(seats_data, list):
			for idx, seat in enumerate(seats_data):
				if isinstance(seat, dict):
					seat_number = seat.get('seat_code') or seat.get('seatNumber') or seat.get('seat_number') or seat.get('seat') or None
					seat_id = seat.get('seat_id') or None
					if seat_number or seat_id:
						seat_map[idx] = {'seat_number': seat_number, 'seat_id': seat_id}

		# Passenger handling: prefer explicit passengers list when provided
		if passenger_ids:
			# Authenticated booking - support both list of ids or list of objects { id, seatNumber, seat_id }
			raw_passengers = data.get('passengers') or []
			for idx, item in enumerate(raw_passengers):
				if isinstance(item, dict):
					pid = int(item.get('id') or item.get('passenger_id') or item.get('passengerId'))
					seat_number = item.get('seat_code') or item.get('seatNumber') or item.get('seat_number') or item.get('seat') or None
					seat_id = int(item.get('seat_id')) if item.get('seat_id') else None
					# If seat info not in item, try to get from seat_map
					if not seat_number and not seat_id and idx in seat_map:
						seat_number = seat_map[idx].get('seat_number')
						seat_id = seat_map[idx].get('seat_id')
					passenger_entries.append({'id': pid, 'seat_number': seat_number, 'seat_id': seat_id})
				else:
					# Simple ID - try to get seat from seat_map
					pid = int(item)
					seat_info = seat_map.get(idx, {})
					passenger_entries.append({
						'id': pid,
						'seat_number': seat_info.get('seat_number'),
						'seat_id': seat_info.get('seat_id')
					})

			# validate passenger ownership
			ids = [e['id'] for e in passenger_entries]
			found_passengers = session.query(Passenger).filter(Passenger.id.in_(ids), Passenger.user_id == user_id).all()
			if len(found_passengers) != len(ids):
				print(f"❌ Passenger validation failed. Found: {[p.id for p in found_passengers]}, Requested: {ids}")
				return jsonify({'success': False, 'message': 'Some passengers not found or not owned by user'}), 404
			# map id -> passenger model
			passenger_map = {p.id: p for p in found_passengers}
			# produce passengers list in same order
			for e in passenger_entries:
				passengers.append(passenger_map[e['id']])
		# Guest passenger flow (no passenger_ids provided)
		if not passenger_entries and guest_passenger_data:
			# Parse date safely - dob is required (validate BEFORE database operations)
			dob_raw = guest_passenger_data.get('dob') or ''
			if not dob_raw or not str(dob_raw).strip():
				print(f"❌ Missing dob in guest_passenger_data")
				return jsonify({'success': False, 'message': 'Date of birth (dob) is required'}), 400
			
			dob_value = None
			dob_str = str(dob_raw).strip()
			# Try multiple date formats
			date_formats = [
				('%Y-%m-%d', 'YYYY-MM-DD'),
				('%d/%m/%Y', 'DD/MM/YYYY'),
				('%m/%d/%Y', 'MM/DD/YYYY'),
				('%d-%m-%Y', 'DD-MM-YYYY'),
				('%m-%d-%Y', 'MM-DD-YYYY')
			]
			
			for fmt, fmt_name in date_formats:
				try:
					dob_value = datetime.strptime(dob_str, fmt).date()
					print(f"✅ Parsed dob '{dob_str}' as {fmt_name}")
					break
				except ValueError:
					continue
			
			if dob_value is None:
				print(f"❌ Invalid date format: {dob_str}")
				return jsonify({'success': False, 'message': f'Invalid date format: {dob_str}. Expected formats: YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY'}), 400

			try:
				guest_passenger = Passenger(
					user_id=user_id,  # Attach to user if token present, otherwise None (guest)
					lastname=guest_passenger_data.get('lastname', ''),
					firstname=guest_passenger_data.get('firstname', ''),
					cccd=guest_passenger_data.get('cccd', ''),
					dob=dob_value,
					gender=guest_passenger_data.get('gender', ''),
					phone_number=guest_passenger_data.get('phone_number') or guest_passenger_data.get('phoneNumber') or '',
					email=guest_passenger_data.get('email', ''),
					address=guest_passenger_data.get('address', ''),
					city=guest_passenger_data.get('city', ''),
					nationality=guest_passenger_data.get('nationality', ''),
					notes=guest_passenger_data.get('notes', '')
				)
				session.add(guest_passenger)
				session.flush()  # Get passenger ID
				passengers = [guest_passenger]
				# if guest_passenger_data contained seat info, preserve in entries (fallback to seat_map[0])
				seat_num = guest_passenger_data.get('seat_code') or guest_passenger_data.get('seatNumber') or guest_passenger_data.get('seat_number')
				seat_id = guest_passenger_data.get('seat_id')
				if not seat_num and seat_map:
					first_seat = seat_map.get(0) or next(iter(seat_map.values()), {})
					seat_num = first_seat.get('seat_number')
					seat_id = seat_id or first_seat.get('seat_id')
				passenger_entries = [{'id': guest_passenger.id, 'seat_number': seat_num, 'seat_id': seat_id}]
				print(f"✅ Created passenger with ID: {guest_passenger.id} (user_id={guest_passenger.user_id})")
			except Exception as e:
				print(f"❌ Error creating passenger: {str(e)}")
				import traceback
				traceback.print_exc()
				# Rollback the session on error
				session.rollback()
				# Re-raise to let outer exception handler return proper error
				raise

		# Server-side recompute / validation of total_amount
		# Assumptions: Flight.price is base economy price per passenger per leg.
		# Apply simple multipliers for fare_class when necessary (premium=+20%, business=+50%).
		# Extras may be provided by client as 'extras_total' or 'extras' object; otherwise assume 0.
		try:
			num_passengers = max(1, len(passengers) if passengers else 1)
			out_price = Decimal(outbound_flight.price or 0)
			in_price = Decimal(inbound_flight.price or 0) if inbound_flight else Decimal('0')
			# Fare class multiplier
			mult = Decimal('1.0')
			if fare_class == FareClass.PREMIUM_ECONOMY:
				mult = Decimal('1.20')
			elif fare_class == FareClass.BUSINESS:
				mult = Decimal('1.50')

			# Base fare for all legs per passenger
			legs_total = (out_price + in_price) * mult
			base_total = (legs_total * Decimal(num_passengers))

			# Extras if provided
			extras_total = Decimal('0')
			if isinstance(data.get('extras_total'), (int, float, str)):
				try:
					extras_total = Decimal(str(data.get('extras_total') or 0))
				except Exception:
					extras_total = Decimal('0')
			elif isinstance(data.get('extras'), dict):
				# if extras object contains a total field
				try:
					extras_total = Decimal(str(data.get('extras').get('total') or 0))
				except Exception:
					extras_total = Decimal('0')

			# Tax/fee: 10% of base_total (rounded)
			tax = (base_total * Decimal('0.10')).quantize(Decimal('1.'))

			recomputed_total = (base_total + extras_total + tax).quantize(Decimal('0.01'))

			# Compare with client-provided total_amount
			# If client sent 0 or invalid amount, use server recomputed value (authoritative)
			if total_amount == 0 or total_amount is None:
				print(f"⚠️ Client sent total_amount=0 or None, using server recomputed value: {recomputed_total}")
				final_total = recomputed_total
			else:
				diff = abs(recomputed_total - total_amount)
				# Tolerance of 5,000 VND for minor rounding/format differences
				TOLERANCE = Decimal('5000')
				if diff > TOLERANCE:
					print(f"❌ Total mismatch: client={total_amount} recomputed={recomputed_total} diff={diff}")
					print(f"⚠️ Using server recomputed value as authoritative: {recomputed_total}")
					# Use server recomputed value instead of rejecting (server is authoritative)
					final_total = recomputed_total
				else:
					# Client value is close enough, use recomputed (authoritative)
					final_total = recomputed_total
			
			print(f"✅ Final total amount: {final_total}")
		except Exception as e:
			print('⚠️ Failed to recompute total on server:', str(e))
			import traceback
			traceback.print_exc()
			# Fallback to client provided total if recompute fails
			# But if client sent 0, use a reasonable default or fail
			if total_amount == 0 or total_amount is None:
				print(f"❌ Cannot create booking: total_amount is 0 and server recompute failed")
				return jsonify({'success': False, 'message': 'Failed to calculate booking total'}), 500
			final_total = total_amount

		# Generate unique booking code (retry if duplicate)
		booking_code = None
		max_retries = 10
		for attempt in range(max_retries):
			proposed_code = Booking.generate_booking_code()
			existing = session.query(Booking).filter_by(booking_code=proposed_code).first()
			if not existing:
				booking_code = proposed_code
				break
		if not booking_code:
			print(f"❌ Failed to generate unique booking code after {max_retries} attempts")
			return jsonify({'success': False, 'message': 'Failed to generate unique booking code'}), 500

		# Create booking
		booking = Booking(
			booking_code=booking_code,
			user_id=user_id,  # Can be None for guest booking
			status=BookingStatus.PENDING,
			trip_type=trip_type,
			fare_class=fare_class,
			outbound_flight_id=outbound_flight_id,
			inbound_flight_id=inbound_flight_id,
			total_amount=final_total
		)
		session.add(booking)
		session.flush()  # Get booking ID
		print(f"✅ Created booking with code: {booking_code}, id: {booking.id}, user_id: {user_id}")

		# Create booking-passenger relationships and persist seat selections when available
		for entry in (passenger_entries if passenger_entries else [{'id': p.id, 'seat_number': None, 'seat_id': None} for p in passengers]):
			pid = int(entry.get('id'))
			pp = next((p for p in passengers if p.id == pid), None)
			if not pp:
				# Defensive: skip if passenger not found
				continue
			
			# Get seat_number and seat_id from entry
			seat_number = entry.get('seat_number') or entry.get('seatNumber') or None
			seat_id = entry.get('seat_id') if entry.get('seat_id') else None
			
			# If we have seat_number but not seat_id, try to find seat_id from Seat table
			if seat_number and not seat_id:
				from backend.models.seats import Seat
				seat = session.query(Seat).filter_by(
					flight_id=outbound_flight_id,
					seat_number=seat_number
				).first()
				if seat:
					seat_id = seat.id
			
			bp = BookingPassenger(
				booking_id=booking.id,
				passenger_id=pp.id,
				seat_id=seat_id,
				seat_number=seat_number
			)
			session.add(bp)

		session.flush()
		# Session will commit automatically when exiting the context manager
		print(f"✅ Booking {booking_code} committed successfully. Total bookings for user {user_id}: checking...")
		
		# Verify booking was created by querying it back
		verify_booking = session.query(Booking).filter_by(booking_code=booking_code, user_id=user_id).first()
		if verify_booking:
			print(f"✅ Verified booking exists: code={verify_booking.booking_code}, id={verify_booking.id}, user_id={verify_booking.user_id}")
		else:
			print(f"⚠️ WARNING: Booking {booking_code} not found after creation!")
		
		return jsonify({
			'success': True, 
			'booking': booking.as_dict(),
			'booking_code': booking.booking_code,
			'booking_id': booking.id
		}), 201
	except Exception as e:
		print(f"❌ Unexpected error in create_booking: {str(e)}")
		import traceback
		traceback.print_exc()
		import sys
		return jsonify({'success': False, 'message': f'Internal server error: {str(e)}'}), 500


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
		booking = session.query(Booking).options(
			joinedload(Booking.passengers).joinedload(BookingPassenger.passenger),
			joinedload(Booking.outbound_flight),
			joinedload(Booking.inbound_flight)
		).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		return jsonify({
			'success': True,
			'booking': booking.as_dict()
		}), 200


@bookings_bp.route('/debug/inspect', methods=['GET'])
def debug_inspect():
	"""Temporary debug endpoint: returns the raw Authorization header, resolved user id and booking counts for that user.
	Use this from the browser or curl while reproducing to confirm what the server actually sees.
	"""
	auth_header = request.headers.get('Authorization')
	user_id = _get_user_id_from_bearer()

	with session_scope() as session:
		bookings = []
		if user_id:
			bookings = session.query(Booking).filter_by(user_id=user_id).order_by(Booking.created_at.desc()).all()
		booking_ids = [b.id for b in bookings]
		booking_details = [{
			'id': b.id,
			'booking_code': b.booking_code,
			'user_id': b.user_id,
			'status': b.status.value if b.status else None,
			'created_at': b.created_at.isoformat() if b.created_at else None
		} for b in bookings]

		# Also check for bookings with user_id=None (guest bookings)
		guest_bookings = session.query(Booking).filter_by(user_id=None).order_by(Booking.created_at.desc()).limit(10).all()
		guest_booking_details = [{
			'id': b.id,
			'booking_code': b.booking_code,
			'user_id': b.user_id,
			'status': b.status.value if b.status else None,
			'created_at': b.created_at.isoformat() if b.created_at else None
		} for b in guest_bookings]

		return jsonify({
			'success': True,
			'auth_header': auth_header,
			'user_id_from_token': user_id,
			'bookings_count': len(bookings),
			'booking_ids': booking_ids,
			'bookings': booking_details,
			'recent_guest_bookings': guest_booking_details
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
		# Eager-load related objects to ensure as_dict can access them within the session
		bookings = session.query(Booking).options(
			joinedload(Booking.passengers).joinedload(BookingPassenger.passenger),
			joinedload(Booking.outbound_flight),
			joinedload(Booking.inbound_flight)
		).filter_by(user_id=user_id).order_by(Booking.created_at.desc()).all()

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
		booking = session.query(Booking).options(
			joinedload(Booking.passengers).joinedload(BookingPassenger.passenger),
			joinedload(Booking.outbound_flight),
			joinedload(Booking.inbound_flight)
		).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# Chỉ có thể cancel booking ở trạng thái PENDING, PAYMENT_FAILED hoặc CONFIRMED
		if booking.status not in [BookingStatus.PENDING, BookingStatus.PAYMENT_FAILED, BookingStatus.CONFIRMED]:
			return jsonify({
				'success': False, 
				'message': f'Cannot cancel booking with status {booking.status.value}'
			}), 400

		# Update booking status
		booking.status = BookingStatus.CANCELLED

		# Reset all seats associated with this booking to AVAILABLE
		from backend.models.seats import Seat
		seats_to_reset = session.query(Seat).filter(Seat.confirmed_booking_id == booking.id).all()
		for seat in seats_to_reset:
			seat.status = 'AVAILABLE'  # Use string value instead of enum
			seat.confirmed_booking_id = None

		session.flush()
		
		return jsonify({
			'success': True,
			'booking': booking.as_dict(),
			'message': 'Booking cancelled successfully'
		}), 200


@bookings_bp.route('/<booking_code>/claim', methods=['POST'])
def claim_booking(booking_code):
	"""Associate a booking (created as guest) with the authenticated user.
	This is used after external payment flows (VNPay) where the booking was
	created without a user_id and the user later returns authenticated.
	"""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	with session_scope() as session:
		booking = session.query(Booking).filter_by(booking_code=booking_code).first()
		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# Only allow claiming if booking currently has no owner
		if booking.user_id is not None and booking.user_id != user_id:
			return jsonify({'success': False, 'message': 'Booking already claimed by another user'}), 403

		booking.user_id = user_id
		session.add(booking)
		session.flush()

		return jsonify({'success': True, 'booking': booking.as_dict(), 'message': 'Booking claimed'}), 200


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
