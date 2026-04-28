from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
import re
import unicodedata
from flask import Blueprint, request, jsonify, current_app
from backend.utils.blockchain_admin import run_post_payment_blockchain_flow
from web3 import Web3
from backend.models.db import session_scope
from backend.models.user import User
from backend.models.passenger import Passenger
from backend.models.booking import Booking, BookingPassenger, BookingStatus, TripType, FareClass
from backend.models.payments import Payment
from backend.models.tickets import Ticket
from backend.models.sky_voucher import SkyVoucher
from sqlalchemy.orm import joinedload
from backend.models.flights import Flight
from backend.utils.blockchain import generate_booking_hash_simple, generate_booking_state_hash
from backend.utils.blockchain_verifier import (
	verify_transaction_receipt,
	check_booking_recorded,
	read_onchain_booking,
	compare_offchain_onchain_hash,
)

bookings_bp = Blueprint('bookings', __name__)


SKY_TO_VND_RATE = Decimal('100')
SKY_REDEEM_VOUCHER_EXPIRY_DAYS = 30


def _normalize_name_for_match(value: str) -> str:
	text = (value or '').strip().lower()
	if not text:
		return ''
	text = unicodedata.normalize('NFD', text)
	text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
	text = re.sub(r'\s+', ' ', text)
	return text


def _name_signature_for_match(value: str) -> str:
	normalized = _normalize_name_for_match(value)
	if not normalized:
		return ''
	tokens = [token for token in normalized.split(' ') if token]
	if not tokens:
		return ''
	return ' '.join(sorted(tokens))


def _find_ticket_for_checkin(session, booking: Booking, matched_bp: BookingPassenger, matched_name: str) -> Ticket | None:
	"""Resolve a ticket for check-in with backward-compatible fallbacks."""
	# 1) ORM relationship (expected for current schema)
	ticket_obj = getattr(matched_bp, 'ticket', None)
	if ticket_obj:
		return ticket_obj

	# 2) Strict lookup by booking_id + passenger mapping.
	# Legacy data may have saved either booking_passengers.id or passengers.id into Ticket.passenger_id.
	passenger_link_ids = [matched_bp.id]
	if matched_bp.passenger_id and matched_bp.passenger_id != matched_bp.id:
		passenger_link_ids.append(matched_bp.passenger_id)

	ticket_obj = session.query(Ticket).filter(
		Ticket.booking_id == booking.id,
		Ticket.passenger_id.in_(passenger_link_ids)
	).order_by(Ticket.issued_at.desc()).first()
	if ticket_obj:
		return ticket_obj

	# 3) If seat is already known, try matching by seat.
	if matched_bp.seat_id:
		ticket_obj = session.query(Ticket).filter_by(
			booking_id=booking.id,
			seat_id=matched_bp.seat_id,
		).order_by(Ticket.issued_at.desc()).first()
		if ticket_obj:
			return ticket_obj

	# 4) Name-based fallback (supports both normal and reversed token order).
	booking_tickets = session.query(Ticket).filter_by(booking_id=booking.id).order_by(Ticket.issued_at.desc()).all()
	if not booking_tickets:
		return None

	if len(booking_tickets) == 1:
		return booking_tickets[0]

	normalized_target = _normalize_name_for_match(matched_name)
	signature_target = _name_signature_for_match(matched_name)

	for candidate_ticket in booking_tickets:
		if _normalize_name_for_match(candidate_ticket.passenger_name) == normalized_target:
			return candidate_ticket

	for candidate_ticket in booking_tickets:
		if _name_signature_for_match(candidate_ticket.passenger_name) == signature_target:
			return candidate_ticket

	return None


def _booking_has_successful_payment(session, booking_id: int) -> bool:
	return session.query(Payment.id).filter(
		Payment.booking_id == booking_id,
		Payment.status == 'SUCCESS'
	).first() is not None


def _auto_issue_missing_tickets_for_checkin(session, booking: Booking) -> list[str]:
	has_successful_payment = _booking_has_successful_payment(session, booking.id)
	if booking.status not in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] and not has_successful_payment:
		return []

	if has_successful_payment and booking.status == BookingStatus.PENDING:
		booking.status = BookingStatus.CONFIRMED
		if not booking.confirmed_at:
			booking.confirmed_at = datetime.utcnow()
		session.add(booking)

	existing_tickets = session.query(Ticket).filter_by(booking_id=booking.id).all()
	existing_passenger_ids = set()
	existing_seat_ids = set()
	existing_name_norm = set()

	for ticket in existing_tickets:
		if ticket.passenger_id is not None:
			existing_passenger_ids.add(ticket.passenger_id)
		if ticket.seat_id is not None:
			existing_seat_ids.add(ticket.seat_id)
		existing_name_norm.add(_normalize_name_for_match(ticket.passenger_name))

	flight = booking.outbound_flight
	if not flight and booking.outbound_flight_id:
		flight = session.query(Flight).filter_by(id=booking.outbound_flight_id).first()

	generated_codes: list[str] = []
	for booking_passenger in booking.passengers or []:
		passenger = booking_passenger.passenger
		passenger_name = f"{getattr(passenger, 'firstname', '') or ''} {getattr(passenger, 'lastname', '') or ''}".strip() or f"Passenger {booking_passenger.id}"
		normalized_name = _normalize_name_for_match(passenger_name)

		if (
			booking_passenger.id in existing_passenger_ids
			or booking_passenger.passenger_id in existing_passenger_ids
			or (booking_passenger.seat_id and booking_passenger.seat_id in existing_seat_ids)
			or normalized_name in existing_name_norm
		):
			continue

		seat = booking_passenger.seat
		base_price = float(flight.price) if (flight and getattr(flight, 'price', None) is not None) else float(booking.total_amount or 0)
		seat_fee = float(seat.price_modifier) if (seat and getattr(seat, 'price_modifier', None) is not None) else 0

		ticket = Ticket.create_ticket(
			booking_id=booking.id,
			passenger_id=booking_passenger.id,
			flight_id=flight.id if flight else booking.outbound_flight_id,
			seat_id=seat.id if seat else None,
			passenger_name=passenger_name,
			base_price=base_price,
			seat_fee=seat_fee,
			phone=getattr(passenger, 'phone_number', None),
			email=getattr(passenger, 'email', None),
			id_number=getattr(passenger, 'cccd', None),
		)

		session.add(ticket)
		generated_codes.append(ticket.ticket_code)

		if seat:
			seat.status = 'CONFIRMED'
			seat.confirmed_booking_id = booking.id

		if booking_passenger.id is not None:
			existing_passenger_ids.add(booking_passenger.id)
		if booking_passenger.passenger_id is not None:
			existing_passenger_ids.add(booking_passenger.passenger_id)
		if seat and seat.id is not None:
			existing_seat_ids.add(seat.id)
		existing_name_norm.add(normalized_name)

	if generated_codes:
		session.flush()

	return generated_codes


def _ensure_booking_tickets_if_eligible(session, booking: Booking) -> bool:
	"""Ensure eligible booking has tickets. Returns True if new tickets were issued."""
	generated_codes = _auto_issue_missing_tickets_for_checkin(session, booking)
	return bool(generated_codes)


def _ensure_tickets_for_bookings_if_eligible(session, bookings: list[Booking]) -> int:
	"""Ensure tickets for a booking list. Returns number of bookings repaired."""
	repaired_count = 0
	for booking in bookings or []:
		if _ensure_booking_tickets_if_eligible(session, booking):
			repaired_count += 1
	return repaired_count


def _get_user_id_from_bearer() -> int | None:
	auth_header = request.headers.get('Authorization')
	if not auth_header or not auth_header.startswith('Bearer '):
		return None
	token = auth_header.split(' ')[1]
	return User.verify_auth_token(token)


def _normalize_tx_hash(tx_hash: str | None) -> str | None:
	if not tx_hash:
		return None
	candidate = str(tx_hash).strip().lower()
	if candidate.startswith('0x'):
		candidate = candidate[2:]
	if len(candidate) != 64:
		return None
	if not all(ch in '0123456789abcdef' for ch in candidate):
		return None
	return '0x' + candidate


def _build_sky_redeem_voucher(user_id: int, amount: Decimal, redeem_type: str) -> dict:
	base_discount_vnd = (amount * SKY_TO_VND_RATE).quantize(Decimal('1'))

	if redeem_type == 'upgrade':
		discount_vnd = (base_discount_vnd * Decimal('1.2')).quantize(Decimal('1'))
		min_order_vnd = max(Decimal('800000'), (discount_vnd * Decimal('2')).quantize(Decimal('1')))
		prefix = 'SKYUP'
		description = 'Voucher nâng hạng chỗ ngồi từ SKY Tokens'
	else:
		discount_vnd = base_discount_vnd
		min_order_vnd = max(Decimal('300000'), (discount_vnd * Decimal('3')).quantize(Decimal('1')))
		prefix = 'SKYDIS'
		description = 'Voucher giảm giá vé máy bay từ SKY Tokens'

	now_utc = datetime.utcnow()
	code = f"{prefix}{now_utc.strftime('%y%m%d%H%M%S')}{user_id % 1000:03d}"
	expires_at = now_utc + timedelta(days=SKY_REDEEM_VOUCHER_EXPIRY_DAYS)

	return {
		'code': code,
		'type': 'fixed',
		'value': int(discount_vnd),
		'min_amount': int(min_order_vnd),
		'currency': 'VND',
		'redeem_type': redeem_type,
		'description': description,
		'expires_at': expires_at.isoformat() + 'Z',
		'rate_vnd_per_sky': int(SKY_TO_VND_RATE),
	}


@bookings_bp.route('/passenger', methods=['POST'])
def create_or_update_passenger():
	"""Create a passenger profile for the logged-in user (or update if exists).

	Request JSON fields (from passenger form):
	lastname, firstname, cccd, dob (MM/DD/YYYY), gender, phoneNumber, email,
	address, city (or customCity when city == 'Kh├íc'), nationality (or customNationality), notes
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

	# Resolve city/nationality when "Kh├íc"
	city = data.get('city')
	if city == 'Kh├íc':
		city = (data.get('customCity') or '').strip()
	nationality = data.get('nationality')
	if nationality == 'Kh├íc':
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
		# select a stored passenger) ΓÇö in that case create a passenger attached to
		# the authenticated user instead of rejecting the request.
		has_passengers = 'passengers' in data and data.get('passengers')
		has_guest = 'guest_passenger' in data and data.get('guest_passenger')

		# Basic common required fields
		base_required = ['outbound_flight_id', 'trip_type', 'fare_class', 'total_amount']
		missing_base = [f for f in base_required if f not in data]
		if missing_base:
			current_app.logger.warning(f"[bookings.create] missing required fields: {missing_base}")
			return jsonify({'success': False, 'message': f'Missing fields: {", ".join(missing_base)}'}), 400

		# Ensure at least one passenger representation is present
		if not has_passengers and not has_guest:
			# If user is unauthenticated, encourage guest_passenger. If authenticated,
			# require either passengers or guest_passenger.
			current_app.logger.warning(
				f"[bookings.create] missing passenger info has_passengers={has_passengers} has_guest={has_guest}"
			)
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
			current_app.logger.warning(f"[bookings.create] failed parse total_amount={total_amount_raw}: {e}")
			total_amount = Decimal('0')

		# Validate trip type consistency
		if trip_type == TripType.ROUND_TRIP and not inbound_flight_id:
			return jsonify({'success': False, 'message': 'Return flight required for round trip'}), 400
		if trip_type == TripType.ONE_WAY and inbound_flight_id:
			return jsonify({'success': False, 'message': 'Return flight not allowed for one-way trip'}), 400

		# Keep all DB work in one transaction scope to avoid race/session inconsistencies.
		with session_scope() as session:
			# Validate flights exist inside the same transaction scope.
			outbound_flight = session.query(Flight).get(outbound_flight_id)
			if not outbound_flight:
				current_app.logger.warning(f"[bookings.create] outbound flight not found id={outbound_flight_id}")
				return jsonify({'success': False, 'message': 'Outbound flight not found'}), 404

			inbound_flight = None
			if inbound_flight_id:
				inbound_flight = session.query(Flight).get(inbound_flight_id)
				if not inbound_flight:
					current_app.logger.warning(f"[bookings.create] inbound flight not found id={inbound_flight_id}")
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
					current_app.logger.warning(
						f"[bookings.create] passenger validation failed found={[p.id for p in found_passengers]} requested={ids}"
					)
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
					current_app.logger.warning("[bookings.create] missing dob in guest_passenger_data")
					return jsonify({'success': False, 'message': 'Date of birth (dob) is required'}), 400
				
				dob_value = None
				dob_str = str(dob_raw).strip()
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
						current_app.logger.debug(f"[bookings.create] parsed dob format={fmt_name}")
						break
					except ValueError:
						continue
				
				if dob_value is None:
					current_app.logger.warning(f"[bookings.create] invalid dob format: {dob_str}")
					return jsonify({'success': False, 'message': f'Invalid date format: {dob_str}. Expected formats: YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY'}), 400

				try:
					guest_passenger = Passenger(
						user_id=user_id,
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
					session.flush()
					passengers = [guest_passenger]
					seat_num = guest_passenger_data.get('seat_code') or guest_passenger_data.get('seatNumber') or guest_passenger_data.get('seat_number')
					seat_id = guest_passenger_data.get('seat_id')
					if not seat_num and seat_map:
						first_seat = seat_map.get(0) or next(iter(seat_map.values()), {})
						seat_num = first_seat.get('seat_number')
						seat_id = seat_id or first_seat.get('seat_id')
					passenger_entries = [{'id': guest_passenger.id, 'seat_number': seat_num, 'seat_id': seat_id}]
					current_app.logger.info(
						f"[bookings.create] created passenger id={guest_passenger.id} user_id={guest_passenger.user_id}"
					)
				except Exception as e:
					current_app.logger.error(f"[bookings.create] create passenger error: {str(e)}")
					import traceback
					traceback.print_exc()
					session.rollback()
					raise

			# Server-side recompute / validation of total_amount
			# Assumptions: Flight.price is base economy price per passenger per leg.
			# Apply simple multipliers for fare_class when necessary (premium=+20%, business=+50%).
			# Extras may be provided by client as 'extras_total' or 'extras' object; otherwise assume 0.
			try:
				num_passengers = max(1, len(passengers) if passengers else 1)
				out_price = Decimal(outbound_flight.price or 0)
				in_price = Decimal(inbound_flight.price or 0) if inbound_flight else Decimal('0')
				mult = Decimal('1.0')
				if fare_class == FareClass.PREMIUM_ECONOMY:
					mult = Decimal('1.20')
				elif fare_class == FareClass.BUSINESS:
					mult = Decimal('1.50')

				legs_total = (out_price + in_price) * mult
				base_total = (legs_total * Decimal(num_passengers))

				extras_total = Decimal('0')
				if isinstance(data.get('extras_total'), (int, float, str)):
					try:
						extras_total = Decimal(str(data.get('extras_total') or 0))
					except Exception:
						extras_total = Decimal('0')
				elif isinstance(data.get('extras'), dict):
					try:
						extras_total = Decimal(str(data.get('extras').get('total') or 0))
					except Exception:
						extras_total = Decimal('0')

				tax = (base_total * Decimal('0.10')).quantize(Decimal('1.'))
				recomputed_total = (base_total + extras_total + tax).quantize(Decimal('0.01'))

				if total_amount == 0 or total_amount is None:
					current_app.logger.info(
						f"[bookings.create] using recomputed total (client total empty): {recomputed_total}"
					)
					final_total = recomputed_total
				else:
					diff = abs(recomputed_total - total_amount)
					TOLERANCE = Decimal('5000')
					if diff > TOLERANCE:
						current_app.logger.warning(
							f"[bookings.create] total mismatch client={total_amount} recomputed={recomputed_total} diff={diff}; using server total"
						)
						final_total = recomputed_total
					else:
						final_total = recomputed_total
				
				current_app.logger.info(f"[bookings.create] final_total={final_total}")
			except Exception as e:
				current_app.logger.warning(f"[bookings.create] failed to recompute total: {str(e)}")
				import traceback
				traceback.print_exc()
				if total_amount == 0 or total_amount is None:
					current_app.logger.error("[bookings.create] cannot create booking: total_amount empty and recompute failed")
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
				current_app.logger.error(f"[bookings.create] failed generating unique booking code after {max_retries} attempts")
				return jsonify({'success': False, 'message': 'Failed to generate unique booking code'}), 500

			# Extract wallet address if provided (optional)
			wallet_address = data.get('wallet_address') or data.get('walletAddress') or None
			if wallet_address and not wallet_address.startswith('0x'):
				wallet_address = None
			
			# Generate blockchain hash from booking code
			booking_state_hash = generate_booking_state_hash({
				'booking_code': booking_code,
				'trip_type': trip_type,
				'fare_class': fare_class,
				'outbound_flight_id': outbound_flight_id,
				'inbound_flight_id': inbound_flight_id,
				'total_amount': final_total,
				'wallet_address': wallet_address,
				'passengers': passenger_entries if passenger_entries else [{'id': p.id, 'seat_number': None} for p in passengers],
			})
			booking_hash = booking_state_hash
			current_app.logger.info(f"[bookings.create] generated booking_hash for {booking_code}")

			# Create booking
			booking = Booking(
				booking_code=booking_code,
				user_id=user_id,
				status=BookingStatus.PENDING,
				trip_type=trip_type,
				fare_class=fare_class,
				outbound_flight_id=outbound_flight_id,
				inbound_flight_id=inbound_flight_id,
				total_amount=final_total,
				booking_hash=booking_hash,
				booking_state_hash=booking_state_hash,
				wallet_address=wallet_address
			)
			session.add(booking)
			session.flush()  # Get booking ID
			current_app.logger.info(
				f"[bookings.create] created booking code={booking_code} id={booking.id} user_id={user_id}"
			)

			# Create booking-passenger relationships and persist seat selections when available
			for entry in (passenger_entries if passenger_entries else [{'id': p.id, 'seat_number': None, 'seat_id': None} for p in passengers]):
				pid = int(entry.get('id'))
				pp = next((p for p in passengers if p.id == pid), None)
				if not pp:
					continue
				
				seat_number = entry.get('seat_number') or entry.get('seatNumber') or None
				seat_id = entry.get('seat_id') if entry.get('seat_id') else None
				
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

			booking.booking_state_hash = generate_booking_state_hash(booking)
			booking.booking_hash = booking.booking_state_hash
			session.flush()
			current_app.logger.info(f"[bookings.create] booking committed code={booking_code} user_id={user_id}")
			
			verify_booking = session.query(Booking).filter_by(booking_code=booking_code, user_id=user_id).first()
			if verify_booking:
				current_app.logger.debug(
					f"[bookings.create] verified booking exists code={verify_booking.booking_code} id={verify_booking.id} user_id={verify_booking.user_id}"
				)
			else:
				current_app.logger.warning(f"[bookings.create] booking not found after creation code={booking_code}")

			return jsonify({
				'success': True,
				'booking': booking.as_dict(),
				'booking_code': booking.booking_code,
				'booking_id': booking.id,
				'booking_hash': booking.booking_hash,
				'wallet_address': booking.wallet_address
			}), 201
	except Exception as e:
		current_app.logger.error(f"[bookings.create] unexpected error: {str(e)}")
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
			joinedload(Booking.passengers).joinedload(BookingPassenger.seat),
			joinedload(Booking.outbound_flight),
			joinedload(Booking.inbound_flight)
		).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		_ensure_booking_tickets_if_eligible(session, booking)

		return jsonify({
			'success': True,
			'booking': booking.as_dict()
		}), 200


@bookings_bp.route('/checkin/lookup', methods=['POST'])
def lookup_booking_for_checkin():
	"""Lookup booking for online check-in by booking code and passenger full name."""
	data = request.get_json(silent=True) or {}
	booking_code = str(data.get('booking_code') or '').strip().upper()
	full_name = str(data.get('full_name') or '').strip()

	if not booking_code or not full_name:
		return jsonify({
			'success': False,
			'message': 'booking_code and full_name are required'
		}), 400

	with session_scope() as session:
		booking = session.query(Booking).options(
			joinedload(Booking.passengers).joinedload(BookingPassenger.passenger),
			joinedload(Booking.passengers).joinedload(BookingPassenger.seat),
			joinedload(Booking.passengers).joinedload(BookingPassenger.ticket),
			joinedload(Booking.outbound_flight),
			joinedload(Booking.inbound_flight)
		).filter_by(booking_code=booking_code).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Không tìm thấy mã đặt chỗ'}), 404

		if booking.status in [BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.PAYMENT_FAILED]:
			return jsonify({
				'success': False,
				'message': f'Booking ở trạng thái {booking.status.value}, không thể check-in'
			}), 400

		normalized_input = _normalize_name_for_match(full_name)
		matched_bp = None
		matched_name = ''

		for bp in booking.passengers or []:
			passenger = bp.passenger
			if not passenger:
				continue
			full_name_forward = f"{passenger.firstname} {passenger.lastname}".strip()
			full_name_reverse = f"{passenger.lastname} {passenger.firstname}".strip()
			candidates = [full_name_forward, full_name_reverse]

			for candidate in candidates:
				if _normalize_name_for_match(candidate) == normalized_input:
					matched_bp = bp
					matched_name = full_name_forward
					break

			if matched_bp:
				break

		if not matched_bp:
			return jsonify({
				'success': False,
				'message': 'Họ tên không khớp với mã đặt chỗ'
			}), 404

		booking_data = booking.as_dict()
		outbound = booking_data.get('outbound_flight') or {}
		seat_number = matched_bp.seat_number
		if not seat_number and getattr(matched_bp, 'seat', None):
			seat_number = getattr(matched_bp.seat, 'seat_number', None)

		ticket_obj = _find_ticket_for_checkin(session, booking, matched_bp, matched_name)
		auto_generated_ticket_codes: list[str] = []
		if not ticket_obj:
			auto_generated_ticket_codes = _auto_issue_missing_tickets_for_checkin(session, booking)
			if auto_generated_ticket_codes:
				ticket_obj = _find_ticket_for_checkin(session, booking, matched_bp, matched_name)
				booking_data = booking.as_dict()
				outbound = booking_data.get('outbound_flight') or {}

		ticket_code = ticket_obj.ticket_code if ticket_obj else None
		has_successful_payment = _booking_has_successful_payment(session, booking.id)
		is_checkin_status_allowed = booking.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] or has_successful_payment
		can_checkin = bool(ticket_code) and is_checkin_status_allowed

		if can_checkin:
			checkin_message = None
		elif not ticket_code and booking.status == BookingStatus.PENDING and not has_successful_payment:
			checkin_message = 'Booking đang chờ thanh toán/xác nhận, vé điện tử chưa được phát hành nên chưa thể check-in online.'
		elif not ticket_code:
			checkin_message = 'Booking chưa có vé điện tử để check-in. Vui lòng liên hệ hỗ trợ.'
		else:
			checkin_message = f'Booking ở trạng thái {booking.status.value}, chưa thể check-in online.'

		return jsonify({
			'success': True,
			'booking': booking_data,
			'passenger': {
				'id': matched_bp.passenger_id,
				'full_name': matched_name,
				'seat_number': seat_number,
				'email': getattr(matched_bp.passenger, 'email', None),
				'ticket_code': ticket_code,
			},
			'flight': {
				'flight_number': outbound.get('flight_number'),
				'route': f"{outbound.get('departure_airport') or ''} → {outbound.get('arrival_airport') or ''}".strip(' →'),
				'departure_time': outbound.get('departure_time'),
				'arrival_time': outbound.get('arrival_time'),
			},
			'can_checkin': can_checkin,
			'checkin_message': checkin_message,
			'auto_ticket_issued': bool(auto_generated_ticket_codes),
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

		_ensure_tickets_for_bookings_if_eligible(session, bookings)

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

		# Chß╗ë c├│ thß╗â cancel booking ß╗ƒ trß║íng th├íi PENDING, PAYMENT_FAILED hoß║╖c CONFIRMED
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

		_ensure_booking_tickets_if_eligible(session, booking)

		return jsonify({
			'success': True,
			'booking': booking.as_dict()
		}), 200


@bookings_bp.route('/my-trips', methods=['GET'])
def get_my_trips():
	"""Get all bookings for a user/wallet address."""
	# Support both user_id from token and wallet_address as query param
	user_id = _get_user_id_from_bearer()
	wallet_address = request.args.get('walletAddress') or request.args.get('wallet_address')
	booking_code = (request.args.get('booking_code') or '').strip()
	
	if not user_id and not wallet_address:
		return jsonify({
			'success': False,
			'message': 'Either authentication or walletAddress parameter required'
		}), 401

	with session_scope() as session:
		# If caller provided a booking_code and is authenticated, try to claim it first.
		# This helps new guest bookings appear immediately after confirmation redirect.
		if user_id and booking_code:
			candidate = session.query(Booking).filter_by(booking_code=booking_code).first()
			if candidate and candidate.user_id is None:
				candidate.user_id = user_id
				session.add(candidate)
				session.flush()

		query = session.query(Booking).options(
			joinedload(Booking.passengers).joinedload(BookingPassenger.passenger),
			joinedload(Booking.outbound_flight),
			joinedload(Booking.inbound_flight)
		)
		
		# Filter by user_id if authenticated, OR by wallet_address
		if user_id:
			query = query.filter(Booking.user_id == user_id)
		elif wallet_address:
			query = query.filter(Booking.wallet_address == wallet_address)
		
		bookings = query.order_by(Booking.created_at.desc()).all()
		_ensure_tickets_for_bookings_if_eligible(session, bookings)
		
		# Build response with status filtering support
		response_bookings = []
		for booking in bookings:
			booking_dict = booking.as_dict()
			response_bookings.append(booking_dict)
		
		return jsonify({
			'success': True,
			'bookings': response_bookings,
			'count': len(response_bookings)
		}), 200


@bookings_bp.route('/wallets/<wallet_address>/sky-balance', methods=['GET'])
def get_wallet_sky_balance(wallet_address):
	"""Get accumulated SKY token reward balance for a wallet from completed bookings."""
	# Normalize wallet address
	wallet_address = wallet_address.lower()
	
	if not wallet_address or len(wallet_address) != 42 or not wallet_address.startswith('0x'):
		return jsonify({
			'success': False,
			'message': 'Invalid wallet address format (must be 42 char Ethereum address)'
		}), 400

	with session_scope() as session:
		# Sum sky_reward_amount for all completed/confirmed bookings linked to this wallet
		from sqlalchemy import func
		sky_balance = session.query(func.sum(Booking.sky_reward_amount)).filter(
			Booking.wallet_address == wallet_address,
			Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED])
		).scalar() or Decimal('0')
		
		balance_float = float(sky_balance)
		
		return jsonify({
			'success': True,
			'wallet_address': wallet_address,
			'sky_balance': balance_float,
			'currency': 'SKY'
		}), 200


@bookings_bp.route('/redeem-sky', methods=['POST'])
def redeem_sky_tokens():
	"""Redeem SKY tokens from user's minted rewards.

	Request JSON:
	- amount: number of SKY to redeem (>0)
	- redeem_type: discount | upgrade
	"""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	data = request.get_json(silent=True) or {}
	raw_amount = data.get('amount')
	redeem_type = str(data.get('redeem_type') or 'discount').strip().lower()

	if redeem_type not in ('discount', 'upgrade'):
		return jsonify({'success': False, 'message': 'Invalid redeem_type'}), 400

	try:
		amount = Decimal(str(raw_amount))
	except Exception:
		return jsonify({'success': False, 'message': 'Invalid amount'}), 400

	if amount <= 0:
		return jsonify({'success': False, 'message': 'Amount must be greater than 0'}), 400

	amount = amount.quantize(Decimal('0.01'))

	with session_scope() as session:
		eligible_bookings = session.query(Booking).filter(
			Booking.user_id == user_id,
			Booking.sky_minted == True,
			Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
		).order_by(Booking.created_at.asc()).all()

		total_earned = Decimal('0')
		total_redeemed = Decimal('0')
		for booking in eligible_bookings:
			reward = Decimal(str(booking.sky_reward_amount or 0))
			redeemed = Decimal(str(booking.sky_redeemed_amount or 0))
			total_earned += reward
			total_redeemed += redeemed

		available = total_earned - total_redeemed
		if amount > available:
			return jsonify({
				'success': False,
				'message': 'Insufficient SKY balance',
				'available_balance': float(available)
			}), 400

		remaining_to_redeem = amount
		updated_booking_codes = []
		for booking in eligible_bookings:
			if remaining_to_redeem <= 0:
				break

			reward = Decimal(str(booking.sky_reward_amount or 0))
			redeemed = Decimal(str(booking.sky_redeemed_amount or 0))
			booking_available = reward - redeemed
			if booking_available <= 0:
				continue

			consume = booking_available if booking_available < remaining_to_redeem else remaining_to_redeem
			booking.sky_redeemed_amount = (redeemed + consume).quantize(Decimal('0.01'))
			updated_booking_codes.append(booking.booking_code)
			remaining_to_redeem -= consume

		new_total_redeemed = (total_redeemed + amount).quantize(Decimal('0.01'))
		new_balance = (total_earned - new_total_redeemed).quantize(Decimal('0.01'))
		voucher = _build_sky_redeem_voucher(user_id=user_id, amount=amount, redeem_type=redeem_type)

		db_voucher = SkyVoucher(
			user_id=user_id,
			code=voucher['code'],
			voucher_type=voucher.get('type') or 'fixed',
			redeem_type=voucher.get('redeem_type') or redeem_type,
			value=Decimal(str(voucher.get('value') or 0)).quantize(Decimal('0.01')),
			min_amount=Decimal(str(voucher.get('min_amount') or 0)).quantize(Decimal('0.01')),
			currency=voucher.get('currency') or 'VND',
			description=voucher.get('description'),
			expires_at=datetime.fromisoformat(str(voucher['expires_at']).replace('Z', '')),
			is_used=False,
		)
		session.add(db_voucher)

		return jsonify({
			'success': True,
			'message': 'Redeemed SKY successfully',
			'redeem': {
				'amount': float(amount),
				'redeem_type': redeem_type,
				'exchange_rate_vnd_per_sky': int(SKY_TO_VND_RATE),
				'voucher': voucher,
				'updated_bookings': updated_booking_codes,
				'total_earned': float(total_earned),
				'total_redeemed': float(new_total_redeemed),
				'remaining_balance': float(new_balance),
			}
		}), 200


@bookings_bp.route('/redeem-vouchers', methods=['GET'])
def get_redeem_vouchers():
	"""Return SKY redeem vouchers for authenticated user."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	include_expired_raw = str(request.args.get('include_expired') or 'false').strip().lower()
	include_expired = include_expired_raw in ('1', 'true', 'yes')

	now_utc = datetime.utcnow()
	with session_scope() as session:
		query = session.query(SkyVoucher).filter(
			SkyVoucher.user_id == user_id,
			SkyVoucher.is_used == False,
		)
		if not include_expired:
			query = query.filter(SkyVoucher.expires_at >= now_utc)

		vouchers = query.order_by(SkyVoucher.created_at.desc()).all()

		return jsonify({
			'success': True,
			'count': len(vouchers),
			'vouchers': [voucher.as_dict() for voucher in vouchers],
		}), 200


@bookings_bp.route('/blockchain/record', methods=['POST'])
def record_booking_on_blockchain():
	"""Record a booking on the blockchain (Sepolia testnet).
	
	Request JSON:
	- booking_code: The booking code to record
	
	Requires:
	- BOOKING_REGISTRY_ADDRESS in .env (deployed contract address)
	- User's MetaMask wallet to sign transaction (frontend responsibility)
	
	This endpoint returns the booking_hash and booking_code that should be
	used to call the smart contract's recordBooking() function.
	"""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	
	if not booking_code:
		return jsonify({'success': False, 'message': 'Missing booking_code'}), 400

	with session_scope() as session:
		booking = session.query(Booking).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# Return booking data needed for blockchain recording
		return jsonify({
			'success': True,
			'booking_code': booking.booking_code,
			'booking_hash': booking.booking_hash,
			'wallet_address': booking.wallet_address,
			'message': 'Use these values to call BookingRegistry.recordBooking() from your wallet'
		}), 200

@bookings_bp.route('/blockchain/integrate-nft', methods=['POST'])
def integrate_ticket_nft_no_gas():
	"""Custodial NFT integration (no-gas for user).

	Request JSON:
	- booking_code: booking code to integrate
	- wallet_address: user's connected wallet (0x...)

	Requires authenticated user. Backend pays gas to:
	- record booking on-chain for the wallet (BookingRegistry.recordBookingFor)
	- mint TicketNFT to the wallet
	- mint SKY rewards
	"""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	data = request.get_json(silent=True) or {}
	booking_code = (data.get('booking_code') or '').strip()
	wallet_address = (data.get('wallet_address') or data.get('walletAddress') or '').strip()

	if not booking_code:
		return jsonify({'success': False, 'message': 'Missing booking_code'}), 400
	if not wallet_address:
		return jsonify({'success': False, 'message': 'Missing wallet_address'}), 400
	if not Web3.is_address(wallet_address):
		return jsonify({'success': False, 'message': 'Invalid wallet_address'}), 400

	with session_scope() as session:
		booking = session.query(Booking).options(
			joinedload(Booking.user).joinedload(User.bookings)
		).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		if booking.status not in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]:
			return jsonify({'success': False, 'message': 'Booking is not paid/confirmed yet'}), 400

		# Link wallet to booking if missing; otherwise enforce match.
		wallet_norm = Web3.to_checksum_address(wallet_address)
		if booking.wallet_address:
			try:
				if Web3.to_checksum_address(booking.wallet_address) != wallet_norm:
					return jsonify({'success': False, 'message': 'Wallet address does not match booking'}), 400
			except Exception:
				return jsonify({'success': False, 'message': 'Invalid wallet_address stored in booking'}), 400
		else:
			booking.wallet_address = wallet_norm

		# Ensure booking_hash exists for on-chain recording
		if not booking.booking_hash:
			booking.booking_hash = booking.booking_state_hash or generate_booking_state_hash(booking)
		if not booking.booking_state_hash:
			booking.booking_state_hash = generate_booking_state_hash(booking)

		# Build tokenURI pointing to this backend
		base = (request.host_url or '').rstrip('/')
		token_uri = f"{base}/api/metadata/ticket/{booking.booking_code}.json"

		result = run_post_payment_blockchain_flow(booking, token_uri=token_uri)
		if result.get('success'):
			current_app.logger.info(f"[integrate-nft] success booking={booking.booking_code} user={user_id}")
			session.commit()
			return jsonify({'success': True, 'message': result.get('message'), 'result': result, 'booking': booking.as_dict()}), 200

		# Do not rollback the whole request: return error, but persist wallet link for retry
		current_app.logger.error(
			f"[integrate-nft] failed booking={booking.booking_code} user={user_id} "
			f"message={result.get('message')} steps={result.get('steps')}"
		)
		session.commit()
		return jsonify({
			'success': False,
			'message': 'Ticket integration is taking longer than expected. Please try again in a moment.',
			'error_code': 'BLOCKCHAIN_INTEGRATION_FAILED'
		}), 400


@bookings_bp.route('/blockchain/onchain-hash', methods=['POST'])
def get_booking_onchain_hash():
	"""Read booking hash from BookingRegistry.getBooking and return to frontend."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	if not booking_code:
		return jsonify({'success': False, 'message': 'Missing booking_code'}), 400

	contract_address = current_app.config.get('BOOKING_REGISTRY_ADDRESS')
	if not contract_address:
		return jsonify({'success': False, 'message': 'BOOKING_REGISTRY_ADDRESS is not configured'}), 500

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

		current_state_hash = generate_booking_state_hash(booking)
		if not booking.booking_state_hash:
			booking.booking_state_hash = current_state_hash
		stored_state_hash = booking.booking_state_hash
		state_hash_matches = (stored_state_hash or '').lower() == current_state_hash.lower()

		success, message, onchain_data = read_onchain_booking(
			booking_code=booking_code,
			contract_address=contract_address
		)
		if not success:
			return jsonify({'success': False, 'message': message}), 400

		# Get block_number and confirmations from tx receipt if tx_hash exists
		block_number = None
		confirmations = 0
		
		tx_hash = _normalize_tx_hash(booking.onchain_record_tx_hash)
		if tx_hash:
			receipt_success, _, receipt = verify_transaction_receipt(tx_hash)
			if receipt_success and receipt:
				from backend.utils.blockchain_verifier import get_web3_connection
				try:
					w3 = get_web3_connection()
					block_number = receipt.get('blockNumber')
					current_block = w3.eth.block_number
					confirmations = (current_block - block_number) if block_number else 0
				except Exception as e:
					current_app.logger.warning(f"Failed to calculate confirmations: {e}")

		# Add block_number and confirmations to onchain_data
		if onchain_data:
			onchain_data['block_number'] = block_number
			onchain_data['confirmations'] = confirmations
			onchain_data['integrity'] = {
				'is_match': state_hash_matches,
				'message': 'Dữ liệu đặt chỗ khớp với trạng thái đã lưu' if state_hash_matches else 'Phát hiện dữ liệu đặt chỗ đã thay đổi trong database',
				'current_state_hash': current_state_hash,
				'stored_state_hash': stored_state_hash,
			}

		return jsonify({
			'success': True,
			'booking_code': booking_code,
			'off_chain_hash': booking.booking_hash,
			'booking_state_hash': stored_state_hash,
			'current_state_hash': current_state_hash,
			'tx_hash': booking.onchain_record_tx_hash,
			'booking': {
				'tx_hash': booking.onchain_record_tx_hash,
				'booking_state_hash': stored_state_hash,
			},
			'on_chain': onchain_data,
			'integrity': {
				'is_match': state_hash_matches,
				'message': 'Dữ liệu đặt chỗ khớp với trạng thái đã lưu' if state_hash_matches else 'Phát hiện dữ liệu đặt chỗ đã thay đổi trong database',
				'current_state_hash': current_state_hash,
				'stored_state_hash': stored_state_hash,
			},
		}), 200


@bookings_bp.route('/blockchain/verify-hash', methods=['POST'])
def verify_booking_hash_onchain():
	"""Compare off-chain booking hash with on-chain BookingRegistry hash and update status."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	if not booking_code:
		return jsonify({'success': False, 'message': 'Missing booking_code'}), 400

	contract_address = current_app.config.get('BOOKING_REGISTRY_ADDRESS')
	if not contract_address:
		return jsonify({'success': False, 'message': 'BOOKING_REGISTRY_ADDRESS is not configured'}), 500

	with session_scope() as session:
		booking = session.query(Booking).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404
		if not booking.booking_hash:
			return jsonify({'success': False, 'message': 'Missing off-chain booking_hash in database'}), 400

		current_state_hash = generate_booking_state_hash(booking)
		if not booking.booking_state_hash:
			booking.booking_state_hash = current_state_hash
		stored_state_hash = booking.booking_state_hash
		state_hash_matches = (stored_state_hash or '').lower() == current_state_hash.lower()

		is_match, message, compare_result = compare_offchain_onchain_hash(
			offchain_hash=booking.booking_hash,
			booking_code=booking_code,
			contract_address=contract_address,
		)

		integrity_message = 'Dữ liệu đặt chỗ khớp với trạng thái đã lưu' if state_hash_matches else 'Phát hiện dữ liệu đặt chỗ đã thay đổi trong database'

		if is_match:
			booking.status = BookingStatus.CONFIRMED
			booking.confirmed_at = datetime.utcnow()
			session.commit()
			return jsonify({
				'success': True,
				'message': 'Booking hash verified successfully',
				'verification': compare_result,
				'integrity': {
					'is_match': state_hash_matches,
					'message': integrity_message,
					'current_state_hash': current_state_hash,
					'stored_state_hash': stored_state_hash,
				},
				'booking_status': 'CONFIRMED',
				'booking': booking.as_dict(),
			}), 200

		booking.status = BookingStatus.PAYMENT_FAILED
		session.commit()
		return jsonify({
			'success': False,
			'message': message,
			'verification': compare_result,
			'integrity': {
				'is_match': state_hash_matches,
				'message': integrity_message,
				'current_state_hash': current_state_hash,
				'stored_state_hash': stored_state_hash,
			},
			'booking_status': 'PAYMENT_FAILED',
			'booking': booking.as_dict(),
		}), 400


@bookings_bp.route('/blockchain/verify', methods=['POST'])
def verify_blockchain_transaction():
	"""Verify a blockchain transaction and update booking status.
	
	Request JSON:
	- booking_code: The booking code
	- tx_hash: Transaction hash from blockchain (0x...)
	
	This endpoint:
	1. Receives tx_hash from frontend
	2. Checks transaction receipt on blockchain
	3. Updates booking status to CONFIRMED (verified) or PAYMENT_FAILED (failed)
	"""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized'}), 401

	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	tx_hash = data.get('tx_hash')
	
	if not booking_code:
		return jsonify({'success': False, 'message': 'Missing booking_code'}), 400
	
	if not tx_hash:
		return jsonify({'success': False, 'message': 'Missing tx_hash'}), 400

	with session_scope() as session:
		# Find booking
		booking = session.query(Booking).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# Verify transaction receipt
		success, message, receipt = verify_transaction_receipt(
			tx_hash=tx_hash,
			expected_from_address=booking.wallet_address
		)

		if not success:
			# Transaction failed - update booking status
			booking.status = BookingStatus.PAYMENT_FAILED
			session.commit()
			
			return jsonify({
				'success': False,
				'message': message,
				'booking_status': 'PAYMENT_FAILED'
			}), 400

		# Get contract address from environment
		contract_address = current_app.config.get('BOOKING_REGISTRY_ADDRESS')
		
		if contract_address:
			# Verify booking was recorded in contract
			contract_success, contract_message = check_booking_recorded(
				tx_hash=tx_hash,
				contract_address=contract_address
			)
			
			if not contract_success:
				booking.status = BookingStatus.PAYMENT_FAILED
				session.commit()
				
				return jsonify({
					'success': False,
					'message': contract_message,
					'booking_status': 'PAYMENT_FAILED'
				}), 400

		# Transaction verified successfully - update booking status
		booking.status = BookingStatus.CONFIRMED
		booking.confirmed_at = datetime.utcnow()
		session.commit()

		return jsonify({
			'success': True,
			'message': 'Booking verified and confirmed on blockchain',
			'booking_status': 'CONFIRMED',
			'tx_hash': tx_hash,
			'booking': booking.as_dict()
		}), 200

