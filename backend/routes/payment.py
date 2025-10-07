from __future__ import annotations
import time
from decimal import Decimal
from flask import Blueprint, jsonify, request
from backend.models.db import session_scope
from backend.models.payment import Payment

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


@payment_bp.route('/create', methods=['POST'])
def create_payment():
	data = request.get_json(silent=True) or {}
	booking_code = data.get('booking_code')
	amount = data.get('amount')

	if not booking_code or amount is None:
		return jsonify({
			'error': 'booking_code and amount are required'
		}), 400

	try:
		amount_dec = Decimal(str(amount))
	except Exception:
		return jsonify({'error': 'amount must be numeric'}), 400

	with session_scope() as session:
		payment = Payment(booking_code=booking_code, amount=amount_dec)
		session.add(payment)
		session.flush()  # get id
		return jsonify({'payment': payment.as_dict()}), 201


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

