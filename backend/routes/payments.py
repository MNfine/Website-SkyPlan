from __future__ import annotations
import time
from datetime import datetime
from decimal import Decimal
from flask import Blueprint, jsonify, request, redirect
from backend.models.db import session_scope
from backend.models.payments import Payment
from backend.models.booking import Booking, BookingStatus
from backend.models.user import User
from backend.models.tickets import Ticket
from backend.config import VNPayConfig
import urllib.parse
import hashlib
import hmac
import os
import re


payment_bp = Blueprint('payment', __name__)


@payment_bp.route('/vnpay/create', methods=['POST'])
def create_vnpay_payment():
	try:
		data = request.get_json() or {}

		# 1) Amount: VNĐ * 100 (số nguyên)
		amount_vnd = int(float(data.get('amount', 1598000)))
		vnp_amount = amount_vnd * 100

		# 2) TxnRef: chỉ A–Z a–z 0–9, cắt ≤ 20 ký tự
		raw_ref = str(data.get('txnRef') or f"SP{int(time.time())}")
		txn_ref = re.sub(r'[^A-Za-z0-9]', '', raw_ref)[:20] or str(int(time.time()))

		# 3) OrderInfo gọn gàng
		order_info = str(data.get('orderInfo') or 'Thanh toan SkyPlan')[:240]

		# 4) IP: tránh ::1 và IPv6, chỉ dùng IPv4
		ip = request.headers.get('X-Forwarded-For', request.remote_addr) or '127.0.0.1'
		if ip == '::1' or ':' in ip:
			ip = '127.0.0.1'

		vnp_TmnCode = os.getenv('VNPAY_TMN_CODE')
		vnp_HashSecret = os.getenv('VNPAY_HASH_SECRET')
		vnp_ReturnUrl = os.getenv('VNPAY_RETURN_URL')
		vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"

		# Tham số theo spec (CHƯA có SecureHashType)
		params = {
			"vnp_Version": "2.1.0",
			"vnp_Command": "pay",
			"vnp_TmnCode": vnp_TmnCode,
			"vnp_Amount": str(vnp_amount),
			"vnp_CurrCode": "VND",
			"vnp_TxnRef": txn_ref,
			"vnp_OrderInfo": order_info,
			"vnp_OrderType": "other",
			"vnp_Locale": "vn",
			"vnp_CreateDate": datetime.utcnow().strftime("%Y%m%d%H%M%S"),
			"vnp_IpAddr": ip,
			"vnp_ReturnUrl": vnp_ReturnUrl,
		}

		# Ký: Sắp xếp key theo ASCII, xây dựng hash_data từ giá trị đã URL-encode từng value
		items = sorted(params.items())
		hash_data = "&".join([f"{key}={urllib.parse.quote_plus(str(value))}" for key, value in items])

		print(f"[vnpay] hash_data (raw, for signing): {hash_data}")
		print(f"[vnpay] vnp_HashSecret: {vnp_HashSecret}")
		secure_hash = hmac.new(vnp_HashSecret.encode('utf-8'), hash_data.encode('utf-8'), hashlib.sha512).hexdigest().upper()
		print(f"[vnpay] secure_hash: {secure_hash}")

		# Thêm chữ ký và SecureHashType vào params
		params["vnp_SecureHashType"] = "SHA512"
		params["vnp_SecureHash"] = secure_hash

		# Tạo URL cuối cùng dùng urlencode với quote_plus
		query = urllib.parse.urlencode(params, quote_via=urllib.parse.quote_plus)
		payment_url = f"{vnp_Url}?{query}"

		print(f"[vnpay] payment_url: {payment_url}")

		return jsonify({"success": True, "paymentUrl": payment_url, "txnRef": txn_ref})
	except Exception as e:
		return jsonify({"success": False, "error": str(e)}), 500


@payment_bp.route('/vnpay/return', methods=['GET'])
def vnpay_return():
	"""Handle VNPay return after payment completion."""
	try:
		# Get all query parameters from VNPay
		vnp_params = request.args.to_dict()

		# Extract secure hash from params
		vnp_secure_hash = vnp_params.pop('vnp_SecureHash', '')
		vnp_secure_hash_type = vnp_params.pop('vnp_SecureHashType', 'SHA512')

		# Sort remaining params for signature verification
		items = sorted(vnp_params.items())
		hash_data = "&".join([f"{key}={urllib.parse.quote_plus(str(value))}" for key, value in items])

		# Get hash secret
		vnp_HashSecret = os.getenv('VNPAY_HASH_SECRET')

		# Verify signature using HMAC-SHA512
		expected_hash = hmac.new(vnp_HashSecret.encode('utf-8'), hash_data.encode('utf-8'), hashlib.sha512).hexdigest().upper()

		if expected_hash != vnp_secure_hash.upper():
			print(f"[vnpay] Signature verification failed. Expected: {expected_hash}, Got: {vnp_secure_hash}")
			return jsonify({"success": False, "error": "Invalid signature"}), 400

		# Extract payment result
		vnp_response_code = vnp_params.get('vnp_ResponseCode', '')
		vnp_transaction_no = vnp_params.get('vnp_TransactionNo', '')
		vnp_txn_ref = vnp_params.get('vnp_TxnRef', '')

		print(f"[vnpay] Payment result - Code: {vnp_response_code}, TxnRef: {vnp_txn_ref}, TransactionNo: {vnp_transaction_no}")

		# Check if payment was successful (00 = success)
		if vnp_response_code == '00':
			# Find and update payment record
			with session_scope() as session:
				payment = session.query(Payment).filter_by(booking_code=vnp_txn_ref).first()
				if payment:
					payment.status = 'SUCCESS'
					payment.transaction_id = vnp_transaction_no
					session.add(payment)

					# Update booking status
					if payment.booking:
						payment.booking.status = BookingStatus.CONFIRMED
						payment.booking.confirmed_at = datetime.utcnow()
						# Persist the actual paid amount to the booking so front-end views (my_trips,
						# confirmation) reflect the final amount the user paid (including discounts/vouchers)
						try:
							if getattr(payment, 'amount', None) is not None:
								payment.booking.total_amount = payment.amount
						except Exception:
							# Non-fatal - continue even if we can't persist the amount
							pass
						session.add(payment.booking)
						
						# Update seat status to CONFIRMED for all passengers in this booking
						from backend.models.seats import Seat, SeatStatus
						for bp in payment.booking.passengers:
							if bp.seat_number:
								# Find seat by seat_number and flight_id
								seat = session.query(Seat).filter_by(
									flight_id=payment.booking.outbound_flight_id,
									seat_number=bp.seat_number
								).first()
								if seat and seat.status != SeatStatus.CONFIRMED.value:
									seat.status = SeatStatus.CONFIRMED.value
									seat.confirmed_booking_id = payment.booking.id
									session.add(seat)
							elif bp.seat_id:
								seat = session.query(Seat).get(bp.seat_id)
								if seat and seat.status != SeatStatus.CONFIRMED.value:
									seat.status = SeatStatus.CONFIRMED.value
									seat.confirmed_booking_id = payment.booking.id
									session.add(seat)

					session.commit()
					print(f"[vnpay] Payment {vnp_txn_ref} confirmed successfully")
				else:
					print(f"[vnpay] Payment record not found for txn_ref: {vnp_txn_ref}")

			# Redirect về trang confirmation.html (frontend) kèm mã giao dịch và booking code
			confirmation_url = f"/confirmation.html?txn_ref={vnp_txn_ref}&transaction_no={vnp_transaction_no}"
			return redirect(confirmation_url)
		else:
			# Payment failed
			with session_scope() as session:
				payment = session.query(Payment).filter_by(booking_code=vnp_txn_ref).first()
				if payment:
					payment.status = 'FAILED'
					session.add(payment)

					# Update booking status
					if payment.booking:
						payment.booking.status = BookingStatus.PAYMENT_FAILED
						session.add(payment.booking)

					session.commit()
					print(f"[vnpay] Payment {vnp_txn_ref} failed with code: {vnp_response_code}")

			# Redirect về trang confirmation.html với trạng thái thất bại
			fail_url = f"/confirmation.html?txn_ref={vnp_txn_ref}&status=fail"
			return redirect(fail_url)

	except Exception as e:
		print(f"[vnpay] Error processing return: {e}")
		return jsonify({"success": False, "error": str(e)}), 500


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
			# Ensure booking reflects the actually paid amount
			try:
				if getattr(payment, 'amount', None) is not None:
					payment.booking.total_amount = payment.amount
			except Exception:
				# ignore failures here - booking status/tickets should not be blocked
				pass

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


@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid():
	"""Quick demo endpoint to mark a booking as paid/confirmed.
	Accepts JSON: { booking_code: str, amount?: number, transaction_id?: str, provider?: str }
	This endpoint is intentionally permissive to allow demo flows (card/bank local simulation).
	"""
	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	amount = data.get('amount')
	transaction_id = data.get('transaction_id')
	provider = data.get('provider', 'manual')

	if not booking_code:
		return jsonify({'success': False, 'message': 'booking_code is required'}), 400

	with session_scope() as session:
		booking = session.query(Booking).filter_by(booking_code=booking_code).first()
		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# If caller provided an Authorization token, attach booking to that user (demo convenience)
		caller_user = _get_user_id_from_bearer()
		if caller_user and (booking.user_id is None):
			booking.user_id = caller_user
			session.add(booking)

		# Create a payment record for audit
		try:
			amount_dec = Decimal(str(amount)) if amount is not None else booking.total_amount
		except Exception:
			amount_dec = booking.total_amount

		payment = Payment(
			booking_id=booking.id,
			booking_code=booking.booking_code,
			amount=amount_dec,
			provider=provider,
			status='SUCCESS',
			transaction_id=transaction_id
		)
		session.add(payment)

		# Persist final paid amount to the booking and mark confirmed
		try:
			booking.total_amount = amount_dec
		except Exception:
			# if assignment fails, continue to set status anyway
			pass
		booking.status = BookingStatus.CONFIRMED
		booking.confirmed_at = datetime.utcnow()
		session.add(booking)

		session.commit()

		return jsonify({'success': True, 'booking_code': booking.booking_code, 'payment': payment.as_dict()}), 200

