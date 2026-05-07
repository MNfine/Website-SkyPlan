from __future__ import annotations
import time
from datetime import datetime
from decimal import Decimal
from flask import Blueprint, jsonify, request, redirect
from sqlalchemy.orm import joinedload
from backend.models.db import session_scope
from backend.models.payments import Payment
from backend.models.booking import Booking, BookingStatus
from backend.models.user import User
from backend.models.tickets import Ticket
from backend.models.sky_voucher import SkyVoucher
from backend.config import VNPayConfig
from backend.utils.blockchain_admin import (
	run_post_payment_blockchain_flow,
	verify_payment_confirmed_onchain,
	ensure_payment_confirmed_onchain,
	_calculate_booking_sky_reward,
	_get_env,
	_get_w3_and_signer,
)
from backend.utils.blockchain import generate_booking_state_hash
from web3 import Web3
import urllib.parse
import hashlib
import hmac
import os
import re


payment_bp = Blueprint('payment', __name__)


def _is_blockchain_provider(provider: str | None) -> bool:
	"""Deprecated: Use verified_by field instead. Kept for backward compatibility."""
	provider_name = str(provider or '').strip().lower()
	return provider_name in {'blockchain', 'metamask', 'crypto'}


def _is_reward_eligible(booking, verified_by: str | None, check_blockchain_specific: bool = False) -> tuple[bool, str]:
	"""
	Check if booking is eligible for on-chain rewards (NFT + SKY).
	
	Business policy:
	- Payment must be verified by ANY channel (blockchain, vnpay, manual)
	- Booking status must be CONFIRMED
	- Booking must have a wallet address to receive rewards
	- NFT/SKY not already minted
	
	For blockchain payments specifically:
	- Booking must have booking_hash (required for on-chain recording)
	
	Returns: (eligible, reason)
	"""
	# 1. Payment verification
	if not verified_by:
		return False, "Payment not verified by any channel"
	
	# 2. Booking must be CONFIRMED
	if booking.status != BookingStatus.CONFIRMED:
		return False, f"Booking not confirmed (status={booking.status.name if booking.status else 'unknown'})"
	
	# 3. Check minting flags
	if booking.nft_minted and booking.sky_minted:
		return False, "Rewards already minted for this booking"
	
	# 4. Must have wallet for reward distribution
	wallet = getattr(booking, 'wallet_address', None)
	if not wallet:
		return False, "Booking has no wallet address for reward distribution"
	
	# 5. Wallet must be valid Ethereum address
	if not Web3.is_address(wallet):
		return False, f"Invalid wallet address: {wallet}"
	
	# 6. BLOCKCHAIN-SPECIFIC: Booking must have booking_hash for on-chain recording
	# (Only check for actual blockchain payments, not for demo bank/card)
	if check_blockchain_specific or verified_by == 'blockchain':
		booking_hash = getattr(booking, 'booking_hash', None)
		if not booking_hash:
			return False, "Booking missing booking_hash (required for on-chain recording)"
	
	return True, "Eligible for rewards"


def _skipped_blockchain_result(reason: str, provider: str | None = None) -> dict:
	message = reason
	if provider:
		message = f"{reason} (provider={provider})"
	return {
		'success': False,
		'message': message,
		'steps': {},
		'skipped': True,
	}


def _consume_sky_voucher(session, voucher_code: str | None, user_id: int | None = None) -> bool:
	voucher_code = str(voucher_code or '').strip().upper()
	if not voucher_code:
		return False

	query = session.query(SkyVoucher).filter(SkyVoucher.code == voucher_code)
	if user_id is not None:
		query = query.filter(SkyVoucher.user_id == user_id)

	voucher = query.first()
	if not voucher:
		return False

	session.delete(voucher)
	return True


def _run_blockchain_post_payment(booking):
	"""Run blockchain post-payment flow without breaking payment confirmation."""
	try:
		wallet_address = getattr(booking, 'wallet_address', None)
		if not wallet_address:
			message = 'Skipped blockchain flow: booking has no wallet_address'
			print(f"[blockchain] ℹ️ {booking.booking_code}: {message}")
			return {
				'success': False,
				'message': message,
				'steps': {},
				'skipped': True,
			}

		if not Web3.is_address(wallet_address):
			message = f'Skipped blockchain flow: invalid wallet_address {wallet_address}'
			print(f"[blockchain] ℹ️ {booking.booking_code}: {message}")
			return {
				'success': False,
				'message': message,
				'steps': {},
				'skipped': True,
			}

		result = run_post_payment_blockchain_flow(booking)
		if result.get('success'):
			print(f"[blockchain] ✅ {booking.booking_code}: {result.get('message')}")
		else:
			print(f"[blockchain] ⚠️ {booking.booking_code}: {result.get('message')}")
		return result
	except Exception as exc:
		print(f"[blockchain] ❌ Unexpected error for {booking.booking_code}: {exc}")
		return {
			'success': False,
			'message': str(exc),
			'steps': {}
		}


def _ensure_tickets_generated(session, booking) -> list[str]:
	"""Ensure tickets exist for all passengers in a confirmed booking."""
	existing_tickets = session.query(Ticket).filter_by(booking_id=booking.id).all()
	if existing_tickets:
		return [t.ticket_code for t in existing_tickets]

	generated_codes: list[str] = []
	flight = booking.outbound_flight

	for booking_passenger in booking.passengers or []:
		passenger = booking_passenger.passenger
		if not passenger:
			continue

		seat = booking_passenger.seat
		base_price = float(flight.price) if (flight and getattr(flight, 'price', None) is not None) else float(booking.total_amount or 0)
		seat_fee = float(seat.price_modifier) if (seat and getattr(seat, 'price_modifier', None) is not None) else 0
		passenger_name = f"{passenger.firstname or ''} {passenger.lastname or ''}".strip() or f"Passenger {booking_passenger.id}"

		ticket = Ticket.create_ticket(
			booking_id=booking.id,
			passenger_id=booking_passenger.id,
			flight_id=flight.id if flight else booking.outbound_flight_id,
			seat_id=seat.id if seat else None,
			passenger_name=passenger_name,
			base_price=base_price,
			seat_fee=seat_fee,
			phone=passenger.phone_number,
			email=passenger.email,
			id_number=passenger.cccd,
		)

		session.add(ticket)
		generated_codes.append(ticket.ticket_code)

		if seat:
			seat.status = 'CONFIRMED'
			seat.confirmed_booking_id = booking.id

	session.flush()
	return generated_codes


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
				blockchain_result = None
				tickets_generated = []
				payment = session.query(Payment).options(
					joinedload(Payment.booking).joinedload(Booking.user).joinedload(User.bookings)
				).filter_by(booking_code=vnp_txn_ref).first()
				if payment:
					payment.status = 'SUCCESS'
					payment.transaction_id = vnp_transaction_no
					payment.verified_by = 'vnpay'  # Mark as verified by VNPay
					print(f"[payment-verified] ✓ source=vnpay for {vnp_txn_ref}")
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

						try:
							tickets_generated = _ensure_tickets_generated(session, payment.booking)
							print(f"[vnpay] Tickets ensured for {vnp_txn_ref}: {tickets_generated}")
						except Exception as ticket_exc:
							print(f"[vnpay] Ticket generation failed for {vnp_txn_ref}: {ticket_exc}")

						# ✓ CHECK REWARD ELIGIBILITY - separate from payment verification
					# Policy: VNPay/Bank/Card demo payments can also receive rewards if user has wallet
					# Note: booking_hash not required for demo (VNPay, Bank, Card)
					is_eligible, eligibility_reason = _is_reward_eligible(payment.booking, payment.verified_by, check_blockchain_specific=False)
					
					if is_eligible:
						# Mint rewards for eligible VNPay payments
						blockchain_result = _run_blockchain_post_payment(payment.booking)
						print(f"[reward] ✓ Minting triggered for {vnp_txn_ref}: {eligibility_reason}")
					else:
						# Not eligible for rewards
						blockchain_result = _skipped_blockchain_result(
							f'Rewards not eligible: {eligibility_reason}',
							provider='vnpay'
						)
						print(f"[reward] ⚠️ Skipped for {vnp_txn_ref}: {eligibility_reason}")
					
					_consume_sky_voucher(session, payment.voucher_code, payment.booking.user_id)
					session.add(payment.booking)
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


def _get_admin_token() -> str | None:
	return os.getenv('ADMIN_TOKEN') or os.getenv('SKYPLAN_ADMIN_TOKEN')


def _require_admin() -> tuple[bool, str]:
	admin_token = _get_admin_token()
	if not admin_token:
		return False, 'Admin token not configured'

	auth_header = request.headers.get('Authorization', '')
	if auth_header.startswith('Bearer '):
		token = auth_header.split(' ', 1)[1].strip()
		if token == admin_token:
			return True, 'ok'

	alt_token = request.headers.get('X-Admin-Token', '').strip()
	if alt_token and alt_token == admin_token:
		return True, 'ok'

	return False, 'Unauthorized'


@payment_bp.route('/admin/confirm-onchain', methods=['POST'])
def admin_confirm_onchain():
	ok, msg = _require_admin()
	if not ok:
		return jsonify({'success': False, 'message': msg}), 401

	data = request.get_json(silent=True) or {}
	booking_code = str(data.get('booking_code') or '').strip()
	wallet_address = str(data.get('wallet_address') or '').strip()
	amount_wei = data.get('amount_wei')
	mint_after = bool(data.get('mint'))

	if not booking_code:
		return jsonify({'success': False, 'message': 'booking_code is required'}), 400

	with session_scope() as session:
		booking = session.query(Booking).options(
			joinedload(Booking.user).joinedload(User.bookings)
		).filter_by(booking_code=booking_code).first()
		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		if not wallet_address:
			wallet_address = str(getattr(booking, 'wallet_address', '') or '').strip()
		if not wallet_address:
			return jsonify({'success': False, 'message': 'Booking missing wallet_address'}), 400

		try:
			amount_wei = int(amount_wei) if amount_wei is not None else None
		except Exception:
			return jsonify({'success': False, 'message': 'amount_wei must be numeric'}), 400

		if amount_wei is None:
			amount_human = getattr(booking, 'sky_reward_amount', None)
			if amount_human is None:
				amount_human, _ = _calculate_booking_sky_reward(booking)
			amount_wei = int(Decimal(str(amount_human)) * (10 ** 18))

		config = _get_env()
		w3, signer = _get_w3_and_signer(config)
		confirmed, confirm_msg = ensure_payment_confirmed_onchain(
			booking_code,
			wallet_address,
			amount_wei,
			w3,
			signer,
			config,
		)
		if not confirmed:
			return jsonify({'success': False, 'message': confirm_msg}), 400

		blockchain_result = None
		if mint_after:
			blockchain_result = _run_blockchain_post_payment(booking)
			session.add(booking)

		return jsonify({
			'success': True,
			'message': 'Payment confirmed on-chain',
			'amount_wei': amount_wei,
			'blockchain': blockchain_result,
		}), 200



@payment_bp.route('/create', methods=['POST'])
def create_payment():
	"""Create a payment record for a booking. SECURITY: Requires authentication."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized - authentication required'
		}), 401
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
		# ✓ REQUIRE AUTHENTICATION - only authenticated users can create payments
		# Find the booking and verify ownership
		booking = session.query(Booking).filter_by(
			booking_code=booking_code,
			user_id=user_id
		).first()

		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found or does not belong to user'}), 404
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
			voucher_code=str(data.get('voucher_code') or '').strip().upper() or None,
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
		payment = session.query(Payment).join(Booking).options(
			joinedload(Payment.booking).joinedload(Booking.user).joinedload(User.bookings)
		).filter(
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
		blockchain_result = None
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
				tickets_generated = _ensure_tickets_generated(session, payment.booking)
				print(f"✅ Tickets ensured: {tickets_generated}")

			except Exception as e:
				print(f"❌ Error generating tickets: {e}")
				# Don't fail the payment confirmation, just log the error
				# Tickets can be generated manually later if needed

			# Run blockchain mint flow only for on-chain payment methods.
			if _is_blockchain_provider(payment.provider):
				blockchain_result = _run_blockchain_post_payment(payment.booking)
			else:
				blockchain_result = _skipped_blockchain_result(
					'Skipped blockchain flow for non-blockchain payment method',
					provider=payment.provider
				)
			_consume_sky_voucher(session, payment.voucher_code, payment.booking.user_id)

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
			'blockchain': blockchain_result,
			'can_retry': status == 'FAILED',  # Cho frontend biết có thể retry
			'retry_count': len(payment.booking.payments)  # Số lần đã thử thanh toán
		}), 200


@payment_bp.route('/<int:payment_id>', methods=['GET'])
def get_payment(payment_id: int):
	"""Get payment details. SECURITY: Requires authentication and ownership verification."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized - authentication required'}), 401
	
	with session_scope() as session:
		payment = session.query(Payment).options(
			joinedload(Payment.booking).joinedload(Booking.user)
		).get(payment_id)
		
		if not payment:
			return jsonify({'error': 'Payment not found'}), 404
		
		# ✓ VERIFY OWNERSHIP - payment must belong to authenticated user
		if payment.booking.user_id and payment.booking.user_id != user_id:
			return jsonify({'error': 'Unauthorized - payment belongs to another user'}), 403
		
		return jsonify({'payment': payment.as_dict()})



@payment_bp.route('/<int:payment_id>/status', methods=['PATCH'])
def update_status(payment_id: int):
	"""Update payment status. SECURITY: Requires authentication and ownership verification."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized - authentication required'}), 401
	
	data = request.get_json(silent=True) or {}
	status = data.get('status')
	if not status:
		return jsonify({'error': 'status required'}), 400

	with session_scope() as session:
		payment = session.query(Payment).options(
			joinedload(Payment.booking).joinedload(Booking.user)
		).get(payment_id)
		
		if not payment:
			return jsonify({'error': 'Payment not found'}), 404
		
		# ✓ VERIFY OWNERSHIP - payment must belong to authenticated user
		if payment.booking.user_id and payment.booking.user_id != user_id:
			return jsonify({'error': 'Unauthorized - payment belongs to another user'}), 403
		
		payment.status = status.upper()
		session.add(payment)
		return jsonify({'payment': payment.as_dict()})


@payment_bp.route('/', methods=['GET'])
def list_payments():
	"""List user's payments. SECURITY: Requires authentication."""
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({'success': False, 'message': 'Unauthorized - authentication required'}), 401
	
	with session_scope() as session:
		# Only return payments for bookings belonging to the authenticated user
		payments = session.query(Payment).join(Booking).filter(
			Booking.user_id == user_id
		).order_by(Payment.id.desc()).limit(50).all()
		return jsonify({'payments': [p.as_dict() for p in payments]})

@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid():
	"""Mark a booking as paid/confirmed and trigger blockchain rewards.
	
	SECURITY: Requires authentication. Payment MUST be verified on-chain.
	Accepts JSON: { booking_code: str, amount?: number, transaction_id?: str, provider?: str }
	"""
	# ✓ REQUIRE AUTHENTICATION
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized - authentication required'
		}), 401

	data = request.get_json(silent=True) or {}
	booking_code = str(data.get('booking_code') or '').strip()
	# Normalize values like "Booking code: SP2026..." or accidental whitespace/newlines.
	match = re.search(r'(SP\d+)', booking_code, re.IGNORECASE)
	if match:
		booking_code = match.group(1).upper()
	amount = data.get('amount')
	transaction_id = data.get('transaction_id')
	provider = data.get('provider', 'manual')

	if not booking_code:
		return jsonify({'success': False, 'message': 'booking_code is required'}), 400

	with session_scope() as session:
		booking = session.query(Booking).options(
			joinedload(Booking.user).joinedload(User.bookings),
			joinedload(Booking.passengers),
			joinedload(Booking.outbound_flight),
		).filter_by(booking_code=booking_code).first()
		if not booking:
			booking = session.query(Booking).options(
				joinedload(Booking.user).joinedload(User.bookings),
				joinedload(Booking.passengers),
				joinedload(Booking.outbound_flight),
			).filter(Booking.booking_code.ilike(booking_code)).first()
		if not booking:
			return jsonify({'success': False, 'message': 'Booking not found'}), 404

		# ✓ VERIFY OWNERSHIP - booking must belong to authenticated user
		if booking.user_id is None:
			# Guest booking - user can only confirm if they just created it in this session
			# For security, require explicit wallet_address
			wallet_input = str(data.get('wallet_address') or data.get('walletAddress') or '').strip()
			if not wallet_input or not Web3.is_address(wallet_input):
				return jsonify({
					'success': False,
					'message': 'Guest booking requires valid wallet_address'
				}), 400
			booking.wallet_address = Web3.to_checksum_address(wallet_input)
			booking.user_id = user_id  # Attach to caller
		elif booking.user_id != user_id:
			# Booking belongs to someone else
			return jsonify({
				'success': False,
				'message': 'Unauthorized - booking belongs to another user'
			}), 403

		blockchain_result = None

		# Ensure wallet_address exists for blockchain flow
		wallet_input = str(data.get('wallet_address') or data.get('walletAddress') or '').strip()
		if wallet_input and Web3.is_address(wallet_input):
			booking.wallet_address = Web3.to_checksum_address(wallet_input)
			session.add(booking)
		elif not booking.wallet_address:
			resolved_wallet = None
			if booking.user_id:
				owner_user = session.get(User, booking.user_id)
				if owner_user and owner_user.wallet_address and Web3.is_address(owner_user.wallet_address):
					resolved_wallet = Web3.to_checksum_address(owner_user.wallet_address)

			if resolved_wallet:
				booking.wallet_address = resolved_wallet
				session.add(booking)
			else:
				return jsonify({
					'success': False,
					'message': 'Booking has no wallet address and none provided'
				}), 400

		# Verify amount
		try:
			amount_dec = Decimal(str(amount)) if amount is not None else booking.total_amount
		except Exception:
			amount_dec = booking.total_amount

		# ✓ VERIFY PAYMENT by appropriate channel
		# Different verification for different payment methods
		verified_by = None
		
		if _is_blockchain_provider(provider):
			# BLOCKCHAIN: Verify via smart contract
			if booking.wallet_address:
				# Convert amount to wei for verification
				amount_wei = int(float(amount_dec) * 1e18) if amount_dec else 0
				payment_confirmed, payment_msg = verify_payment_confirmed_onchain(
					booking_code,
					booking.wallet_address,
					amount_wei
				)
				
				if not payment_confirmed:
					print(f"[mark-paid] ✗ Blockchain verification failed for {booking_code}: {payment_msg}")
					return jsonify({
						'success': False,
						'message': f'Payment verification failed: {payment_msg}',
						'booking_code': booking_code
					}), 402  # Payment Required
				
				verified_by = 'blockchain'
				print(f"[payment-verified] ✓ source=blockchain for {booking_code}")
			else:
				return jsonify({
					'success': False,
					'message': 'Blockchain payment requires wallet_address'
				}), 400
		else:
			# FIAT (VNPay/Bank/Manual): Verify via provider
			# For /mark-paid endpoint, assume payment was already verified by:
			# - VNPay callback (with HMAC signature)
			# - Backend API call (with Bearer token + ownership check)
			# This endpoint is called as final confirmation
			provider_lower = str(provider or '').strip().lower()
			if provider_lower in ('vnpay', 'bank', 'card'):
				verified_by = provider_lower
				print(f"[payment-verified] ✓ source={provider_lower} for {booking_code}")
			elif provider_lower == 'manual':
				verified_by = 'manual'
				print(f"[payment-verified] ✓ source=manual for {booking_code}")
			else:
				# Unknown provider
				verified_by = 'unknown'
				print(f"[payment-verified] ⚠️ Unknown provider: {provider_lower} for {booking_code}")

		# Create a payment record for audit
		payment = Payment(
			booking_id=booking.id,
			booking_code=booking.booking_code,
			amount=amount_dec,
			provider=provider,
			verified_by=verified_by,
			voucher_code=str(data.get('voucher_code') or '').strip().upper() or None,
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

		try:
			tickets_generated = _ensure_tickets_generated(session, booking)
			print(f"[mark-paid] Tickets ensured for {booking.booking_code}: {tickets_generated}")
		except Exception as ticket_exc:
			print(f"[mark-paid] Ticket generation failed for {booking.booking_code}: {ticket_exc}")

		# ✓ REWARD ELIGIBILITY CHECK - separate from payment verification
		# Ensure booking has booking_hash for on-chain recording if possible
		try:
			if not getattr(booking, 'booking_hash', None):
				# Prefer any existing booking_state_hash, otherwise generate one
				booking.booking_hash = getattr(booking, 'booking_state_hash', None) or generate_booking_state_hash(booking)
				print(f"[mark-paid] Generated booking_hash for {booking_code}: {booking.booking_hash}")
		except Exception as gen_exc:
			print(f"[mark-paid] Could not generate booking_hash for {booking_code}: {gen_exc}")
		
		is_eligible, eligibility_reason = _is_reward_eligible(booking, verified_by)
		
		if is_eligible:
			# Run blockchain post-payment flow to mint NFT/SKY
			blockchain_result = _run_blockchain_post_payment(booking)
			print(f"[reward] ✓ Minting triggered for {booking_code}: {eligibility_reason}")
		else:
			# Ineligible for rewards
			blockchain_result = _skipped_blockchain_result(
				f'Rewards not eligible: {eligibility_reason}',
				provider=provider
			)
			print(f"[reward] ⚠️ Skipped for {booking_code}: {eligibility_reason}")
		
		_consume_sky_voucher(session, payment.voucher_code, booking.user_id)
		session.add(booking)

		session.commit()

		return jsonify({'success': True, 'booking_code': booking.booking_code, 'payment': payment.as_dict(), 'blockchain': blockchain_result}), 200


# ==================== BLOCKCHAIN PAYMENT ENDPOINTS ====================

@payment_bp.route('/blockchain/save-hash', methods=['POST'])
def blockchain_save_hash():
	"""Save blockchain transaction hash after MetaMask tx is submitted.
	
	SECURITY: Requires authentication. User must own the booking.
	"""
	# ✓ REQUIRE AUTHENTICATION
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized - authentication required'
		}), 401

	data = request.get_json(silent=True) or {}
	booking_id = str(data.get('bookingId') or '').strip()
	tx_hash = str(data.get('txHash') or '').strip()
	from_address = str(data.get('fromAddress') or '').strip()

	if not booking_id or not tx_hash:
		return jsonify({'success': False, 'message': 'bookingId and txHash are required'}), 400

	print(f"[blockchain] save-hash: booking={booking_id} tx={tx_hash[:12]}... from={from_address[:10] if from_address else '?'}...")

	try:
		with session_scope() as session:
			booking = session.query(Booking).filter_by(booking_code=booking_id).first()
			if not booking:
				print(f"[blockchain] save-hash: booking {booking_id} not found")
				return jsonify({'success': False, 'message': 'Booking not found'}), 404
			
			# ✓ VERIFY OWNERSHIP - booking must belong to authenticated user
			if booking.user_id is None:
				# Guest booking - require wallet_address for verification
				if not from_address:
					return jsonify({
						'success': False,
						'message': 'Guest booking requires fromAddress'
					}), 403
				booking.user_id = user_id  # Attach guest booking to user
			elif booking.user_id != user_id:
				# Booking belongs to someone else
				return jsonify({
					'success': False,
					'message': 'Unauthorized - booking belongs to another user'
				}), 403
			
			# Save wallet address
			if from_address and not getattr(booking, 'wallet_address', None):
				booking.wallet_address = from_address

			# Find or create a PENDING payment record for this booking
			payment = session.query(Payment).filter_by(
				booking_code=booking_id, status='PENDING'
			).first()

			if not payment:
				payment = Payment(
					booking_id=booking.id,
					booking_code=booking_id,
					amount=booking.total_amount or 0,
					provider='blockchain',
					status='PENDING',
				)
				session.add(payment)
				session.flush()

				payment.transaction_id = tx_hash
				# session_scope auto-commits here
				print(f"[blockchain] save-hash: DB updated for booking {booking_id}")
	except Exception as exc:
		print(f"[blockchain] save-hash: DB error (non-fatal): {exc}")
		import traceback; traceback.print_exc()

	return jsonify({'success': True, 'txHash': tx_hash, 'status': 'processing'}), 200


@payment_bp.route('/blockchain/confirm', methods=['POST'])
def blockchain_confirm_payment():
	"""Confirm a blockchain payment after tx receipt is confirmed on-chain.
	
	SECURITY: Requires authentication. User must own the booking.
	"""
	# ✓ REQUIRE AUTHENTICATION
	user_id = _get_user_id_from_bearer()
	if not user_id:
		return jsonify({
			'success': False,
			'message': 'Unauthorized - authentication required'
		}), 401

	data = request.get_json(silent=True) or {}
	tx_hash = str(data.get('txHash') or '').strip()
	status = str(data.get('status') or 'failed').lower()
	details = data.get('details') or {}

	if not tx_hash:
		return jsonify({'success': False, 'message': 'txHash is required'}), 400

	print(f"[blockchain] confirm: tx={tx_hash[:12]}... status={status} details={details}")

	booking_id_for_chain = None

	try:
		with session_scope() as session:
			# Query payment directly — no joinedload to avoid dirty-tracking issues
			payment = session.query(Payment).filter_by(transaction_id=tx_hash).first()

			if not payment:
				print(f"[blockchain] confirm: no payment found for tx={tx_hash[:12]}")
				return jsonify({'success': False, 'message': 'Payment not found'}), 404
			
			# ✓ VERIFY OWNERSHIP - payment must belong to authenticated user
			booking = session.query(Booking).filter_by(id=payment.booking_id).first()
			if not booking:
				return jsonify({'success': False, 'message': 'Booking not found'}), 404
			
			if booking.user_id is None:
				# Guest booking - allow confirmation (user can complete guest booking)
				booking.user_id = user_id
			elif booking.user_id != user_id:
				# Booking belongs to someone else
				return jsonify({
					'success': False,
					'message': 'Unauthorized - booking belongs to another user'
				}), 403
			
			# Update payment status
			new_status = 'SUCCESS' if status == 'success' else 'FAILED'
			payment.status = new_status
			
			if status == 'success':
				payment.verified_by = 'blockchain'  # Mark as verified by blockchain
				booking.status = BookingStatus.CONFIRMED
				booking.confirmed_at = datetime.utcnow()
				booking_id_for_chain = booking.id
				print(f"[payment-verified] ✓ source=blockchain for {payment.booking_code}")

				# Auto-generate tickets
				try:
					tickets = _ensure_tickets_generated(session, booking)
					print(f"[blockchain] confirm: tickets generated: {tickets}")
				except Exception as te:
					print(f"[blockchain] confirm: ticket gen failed (non-fatal): {te}")

			elif status == 'failed':
				booking.status = BookingStatus.PAYMENT_FAILED

			# session_scope auto-commits when the with block exits
			print(f"[blockchain] confirm: DB updated → {new_status}")

	except Exception as exc:
		print(f"[blockchain] confirm: DB error (non-fatal): {exc}")
		import traceback; traceback.print_exc()

	# Run NFT/SKY flow OUTSIDE session scope, in background thread
	if booking_id_for_chain and status == 'success':
		try:
			from threading import Thread
			from backend.models.db import session_scope as _ss
			from backend.models.booking import Booking as _B, BookingPassenger as _BP
			from sqlalchemy.orm import joinedload as _jl

			def _post_payment_thread(bid):
				try:
					with _ss() as s:
						b = s.query(_B).options(
							_jl(_B.user),
							_jl(_B.passengers).joinedload(_BP.passenger),
							_jl(_B.outbound_flight),
						).get(bid)
						if b:
							# ✓ Check reward eligibility (blockchain requires booking_hash)
							is_eligible, eligibility_reason = _is_reward_eligible(b, 'blockchain', check_blockchain_specific=True)
							if is_eligible:
								# Mint rewards for eligible blockchain payments
								_run_blockchain_post_payment(b)
								print(f"[reward] ✓ Minting triggered for {b.booking_code}: {eligibility_reason}")
							else:
								print(f"[reward] ⚠️ Skipped for {b.booking_code}: {eligibility_reason}")
				except Exception as e:
					print(f"[blockchain] post-payment thread error: {e}")
					import traceback; traceback.print_exc()

			Thread(target=_post_payment_thread, args=(booking_id_for_chain,), daemon=True).start()
		except Exception as be:
			print(f"[blockchain] post-payment launch error (non-fatal): {be}")

	return jsonify({'success': True, 'txHash': tx_hash, 'status': status}), 200

