from __future__ import annotations

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from backend.models.db import session_scope
from backend.models.user import User
from backend.models.passenger import Passenger

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
