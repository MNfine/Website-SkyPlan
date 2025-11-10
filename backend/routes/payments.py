from __future__ import annotations
import time
from datetime import datetime
from decimal import Decimal
from flask import Blueprint, jsonify, request
from backend.models.db import session_scope
from backend.models.payments import Payment
from backend.models.booking import Booking, BookingStatus
from backend.models.user import User
from backend.models.tickets import Ticket

payment_bp = Blueprint('payment', __name__)

@payment_bp.route('/vnpay/create', methods=['POST'])
def create_vnpay_payment():
	try:
		data = request.get_json() or {}
		order_info = data.get('orderInfo', 'Ve may bay SkyPlan')
		amount = data.get('amount', 1598000)
		txn_ref = data.get('txnRef', f'SP{int(time.time())}')
		# TODO: Thay thế bằng logic tạo URL VNPay thực tế
		payment_url = f"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?orderInfo={order_info}&amount={amount}&txnRef={txn_ref}"
		return jsonify({
			'success': True,
			'paymentUrl': payment_url,
			'txnRef': txn_ref
		})
	except Exception as e:
		return jsonify({'success': False, 'error': str(e)}), 500


def _get_user_id_from_bearer() -> int | None:
	auth_header = request.headers.get('Authorization')
	if not auth_header or not auth_header.startswith('Bearer '):
		return None
	token = auth_header.split(' ')[1]
	return User.verify_auth_token(token)


@payment_bp.route('/create', methods=['POST'])
def create_payment():
	"""Create a payment record for a booking. Supports both authenticated users and guest bookings."""
	user_id = _get_user_id_from_bearer()  # Optional - can be None for guest bookings

	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	amount = data.get('amount')
	provider = data.get('provider', 'vnpay')

	if not booking_code or amount is None:
		return jsonify({
			'success': False,
			'message': 'booking_code and amount are required'
		}), 400

	try:
		amount_dec = Decimal(str(amount))
	except Exception:
		return jsonify({'success': False, 'message': 'amount must be numeric'}), 400

	with session_scope() as session:
		# Find the booking - for guest bookings, user_id will be None
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

		# Kiểm tra booking status có thể thanh toán
		if booking.status not in [BookingStatus.PENDING, BookingStatus.PAYMENT_FAILED]:
			return jsonify({
				'success': False,
				'message': f'Booking status {booking.status.value} cannot be paid'
			}), 400

		# Verify amount matches booking total
		if amount_dec != booking.total_amount:
			return jsonify({
				'success': False, 
				'message': f'Amount mismatch. Expected {booking.total_amount}, got {amount_dec}'
			}), 400

		# Create payment record
		payment = Payment(
			booking_id=booking.id,
			booking_code=booking_code,
			amount=amount_dec,
			provider=provider,
			status='PENDING'
		)
		session.add(payment)
		session.flush()  # get id
		
		return jsonify({
			'success': True,
			'payment': payment.as_dict(),
			'retry_attempt': len(booking.payments),  # Số lần thử thanh toán
			'booking_status': booking.status.value
		}), 201


@payment_bp.route('/confirm', methods=['POST'])
def confirm_payment():
	"""Confirm payment and update booking status."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized'
		}), 401

	data = request.get_json(silent=True) or {}
	payment_id = data.get('payment_id')
	transaction_id = data.get('transaction_id')
	status = data.get('status', 'SUCCESS')

	if not payment_id:
		return jsonify({
			'success': False,
			'message': 'payment_id is required'
		}), 400

	with session_scope() as session:
		# Find payment and verify ownership
		payment = session.query(Payment).join(Booking).filter(
			Payment.id == payment_id,
			Booking.user_id == user_id
		).first()

		if not payment:
			return jsonify({'success': False, 'message': 'Payment not found'}), 404

		# Update payment status
		payment.status = status
		if transaction_id:
			payment.transaction_id = transaction_id

		# Update booking status based on payment result
		tickets_generated = []
		if status == 'SUCCESS':
			payment.booking.status = BookingStatus.CONFIRMED
			payment.booking.confirmed_at = datetime.utcnow()
			
			# AUTO-GENERATE TICKETS after successful payment
			try:
				# Check if tickets already exist
				existing_tickets = session.query(Ticket).filter_by(booking_id=payment.booking_id).all()
				
				if not existing_tickets:
					# Generate tickets for each passenger
					for booking_passenger in payment.booking.passengers:
						passenger = booking_passenger.passenger
						flight = payment.booking.outbound_flight  # Primary flight
						seat = booking_passenger.seat
						
						# Calculate pricing
						base_price = float(flight.price)
						seat_fee = float(seat.price_modifier) if seat else 0
						
						# Create ticket with unique code
						ticket = Ticket.create_ticket(
							booking_id=payment.booking.id,
							passenger_id=booking_passenger.id,
							flight_id=flight.id,
							seat_id=seat.id if seat else None,
							passenger_name=passenger.full_name,
							base_price=base_price,
							seat_fee=seat_fee,
							phone=passenger.phone,
							email=passenger.email,
							id_number=passenger.passport_number or passenger.id_number
						)
						
						session.add(ticket)
						tickets_generated.append(ticket.ticket_code)
						
						# Confirm seat reservation
						if seat:
							seat.status = 'CONFIRMED'
							seat.confirmed_booking_id = payment.booking.id
					
					session.flush()  # Ensure ticket codes are generated
					print(f"✅ Generated {len(tickets_generated)} tickets: {tickets_generated}")
				else:
					tickets_generated = [t.ticket_code for t in existing_tickets]
					print(f"✅ Tickets already exist: {tickets_generated}")
					
			except Exception as e:
				print(f"❌ Error generating tickets: {e}")
				# Don't fail the payment confirmation, just log the error
				# Tickets can be generated manually later if needed
		
		elif status == 'FAILED':
			# Giữ booking để user có thể retry, không cancel luôn
			payment.booking.status = BookingStatus.PAYMENT_FAILED
			# Booking vẫn có thể được thanh toán lại
		# CANCELLED chỉ khi user chủ động hủy qua API riêng

		session.flush()
		
		return jsonify({
			'success': True,
			'payment': payment.as_dict(),
			'booking_status': payment.booking.status.value,
			'booking_code': payment.booking.booking_code,
			'tickets_generated': tickets_generated if status == 'SUCCESS' else [],
			'can_retry': status == 'FAILED',  # Cho frontend biết có thể retry
			'retry_count': len(payment.booking.payments)  # Số lần đã thử thanh toán
		}), 200


@payment_bp.route('/<int:payment_id>', methods=['GET'])
def get_payment(payment_id: int):
	with session_scope() as session:
		payment = session.get(Payment, payment_id)
		if not payment:
			return jsonify({'error': 'Payment not found'}), 404
		return jsonify({'payment': payment.as_dict()})


@payment_bp.route('/<int:payment_id>/status', methods=['PATCH'])
def update_status(payment_id: int):
	data = request.get_json(silent=True) or {}
	status = data.get('status')
	if not status:
		return jsonify({'error': 'status required'}), 400

	with session_scope() as session:
		payment = session.get(Payment, payment_id)
		if not payment:
			return jsonify({'error': 'Payment not found'}), 404
		payment.status = status.upper()
		session.add(payment)
		return jsonify({'payment': payment.as_dict()})


@payment_bp.route('/', methods=['GET'])
def list_payments():
	with session_scope() as session:
		payments = session.query(Payment).order_by(Payment.id.desc()).limit(50).all()
		return jsonify({'payments': [p.as_dict() for p in payments]})

