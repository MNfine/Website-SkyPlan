"""
VNPay Payment Integration for SkyPlan
Python Flask backend for handling VNPay payments
"""

import hashlib
import hmac
import urllib.parse
import json
import time
from datetime import datetime
from decimal import Decimal
from flask import Blueprint, request, jsonify, redirect
import requests
from urllib.parse import quote_plus

# Import configuration
from config import VNPayConfig

# Create Blueprint for payment routes
payment_bp = Blueprint('payment', __name__)

class VNPayService:
    """Service class for VNPay payment processing"""
    
    @staticmethod
    def create_payment_url(order_info, amount, txn_ref, ip_addr="127.0.0.1"):
        """Create VNPay payment URL with secure hash"""
        
        # Format date exactly as required by VNPay
        create_date = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Make sure txn_ref doesn't contain any special characters and limit length to 25 characters
        # VNPay yêu cầu mã giao dịch tối đa 100 ký tự, nhưng để an toàn nên giữ ngắn hơn
        safe_txn_ref = ''.join(c for c in txn_ref if c.isalnum())
        if len(safe_txn_ref) > 20:
            safe_txn_ref = safe_txn_ref[:20]  # Cắt bớt nếu quá dài
        
        # Thêm timestamp ngắn để đảm bảo là duy nhất
        timestamp_short = str(int(time.time()))[-6:]
        safe_txn_ref = f"{safe_txn_ref}_{timestamp_short}"
        
        # Ensure amount is a valid integer
        try:
            amount_int = int(float(amount)) * 100  # Convert to lowest currency unit (cents)
        except (ValueError, TypeError):
            amount_int = 1598000 * 100  # Default if conversion fails
        
        # Create parameters dict with correct format
        vnp_params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": VNPayConfig.TMN_CODE,
            "vnp_Amount": str(amount_int),  
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": safe_txn_ref,
            "vnp_OrderInfo": order_info,
            "vnp_OrderType": "190000",  # Fixed value for general payment
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": VNPayConfig.RETURN_URL,
            "vnp_IpAddr": ip_addr,
            "vnp_CreateDate": create_date
        }
        
        # Replace spaces in vnp_OrderInfo with '+' for compatibility
        vnp_params['vnp_OrderInfo'] = vnp_params['vnp_OrderInfo'].replace(' ', '+')
        
        # Sort parameters by key name
        sorted_params = sorted(vnp_params.items())
        
        # Create raw hash data WITHOUT URL encoding for signature generation
        # raw_hash_data = '&'.join([f"{key}={str(value)}" for key, value in sorted_params])
        
        # URL encode từng giá trị trước khi tạo raw hash data
        raw_hash_data = "&".join([f"{key}={quote_plus(str(value))}" for key, value in sorted_params])
        
        # Tạo chữ ký
        secure_hash = hmac.new(
            VNPayConfig.HASH_SECRET.encode('utf-8'),
            raw_hash_data.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        # Tạo URL thanh toán với hash
        query_string = "&".join([f"{key}={quote_plus(str(value))}" for key, value in sorted_params])
        payment_url = f"{VNPayConfig.get_payment_url()}?{query_string}&vnp_SecureHash={secure_hash}"
        
        return payment_url
    
    @staticmethod
    def verify_return_data(params):
        """Verify VNPay return data signature"""
        
        if 'vnp_SecureHash' not in params:
            print("Missing vnp_SecureHash in return data")
            return False
            
        if not VNPayConfig.is_configured():
            print("VNPay not properly configured")
            return False
            
        vnp_secure_hash = params['vnp_SecureHash']
        params_copy = params.copy()
        del params_copy['vnp_SecureHash']
        
        if 'vnp_SecureHashType' in params_copy:
            del params_copy['vnp_SecureHashType']  # Remove this field if present
        
        # Sort parameters
        sorted_params = sorted(params_copy.items())
        
        # Create hash data (without URL encoding)
        hash_data = '&'.join([f"{key}={quote_plus(str(value))}" for key, value in sorted_params])
        
        # Calculate secure hash
        calculated_hash = hmac.new(
            VNPayConfig.HASH_SECRET.encode('utf-8'),
            hash_data.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        print(f"  Calculated hash: {calculated_hash}")
        print(f"  Match: {calculated_hash == vnp_secure_hash}")
        
        return calculated_hash == vnp_secure_hash

@payment_bp.route('/test', methods=['GET'])
def test_payment_config():
    """Test endpoint for checking VNPay configuration"""
    
    # Check if VNPay is configured
    is_configured = VNPayConfig.is_configured()
    
    # Get configuration (with sensitive data masked)
    config = {
        "TMN_CODE": VNPayConfig.TMN_CODE,
        "HASH_SECRET": VNPayConfig.HASH_SECRET[:5] + "..." if VNPayConfig.HASH_SECRET else None,
        "ENVIRONMENT": VNPayConfig.ENVIRONMENT,
        "PAYMENT_URL": VNPayConfig.get_payment_url(),
        "RETURN_URL": VNPayConfig.RETURN_URL,
        "IS_CONFIGURED": is_configured
    }
    
    # Create sample payment URL (for testing)
    sample_url = None
    if is_configured:
        try:
            sample_url = VNPayService.create_payment_url(
                order_info="TEST ORDER", 
                amount=10000, 
                txn_ref=f"TEST{int(time.time())}"
            )
        except Exception as e:
            sample_url = f"Error: {str(e)}"
    
    return jsonify({
        "status": "configured" if is_configured else "not_configured",
        "config": config,
        "sample_url": sample_url
    })

@payment_bp.route('/vnpay/create', methods=['POST'])
def create_vnpay_payment():
    """Create VNPay payment URL"""
    
    try:
        data = request.get_json()
        
        # Extract payment data
        order_info = data.get('orderInfo', 'Ve may bay SkyPlan')
        amount = data.get('amount', 1598000)
        txn_ref = data.get('txnRef', f'SP{int(time.time())}')
        
        # Get client IP
        ip_addr = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', '127.0.0.1'))
        
        # Create payment URL
        payment_url = VNPayService.create_payment_url(order_info, amount, txn_ref, ip_addr)
        
        return jsonify({
            'success': True,
            'paymentUrl': payment_url,
            'txnRef': txn_ref
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@payment_bp.route('/vnpay/return', methods=['GET'])
def vnpay_return():
    """Handle VNPay return callback"""
    
    # Get current frontend URL from config
    frontend_url = 'http://localhost:5000'  # Default
    
    try:
        # Get all query parameters
        params = request.args.to_dict()
        
        print("VNPay Return Parameters:")
        for key, value in params.items():
            print(f"  {key}: {value}")
        
        # Verify signature
        is_valid = VNPayService.verify_return_data(params)
        
        if not is_valid:
            print("Invalid signature in VNPay return data")
            # Thêm thông tin cụ thể hơn vào URL redirect để giúp debug
            msg = urllib.parse.quote_plus("Sai chữ ký - Vui lòng kiểm tra logs")
            return redirect(f"{frontend_url}/payment.html?error=true&message={msg}&code=97")
        
        # Check response code
        response_code = params.get('vnp_ResponseCode', '')
        txn_ref = params.get('vnp_TxnRef', '')
        amount = int(params.get('vnp_Amount', 0)) / 100
        
        if response_code == '00':
            # Payment successful
            print(f"Payment successful: {txn_ref}, Amount: {amount}")
            # Here you would typically:
            # 1. Update order status in database
            # 2. Send confirmation email
            # 3. Generate ticket/booking confirmation
            
            return redirect(f"{frontend_url}/confirmation.html?success=true&txnRef={txn_ref}&amount={amount}")
        else:
            # Payment failed
            error_msg = get_vnpay_error_message(response_code)
            print(f"Payment failed: {txn_ref}, Code: {response_code}, Message: {error_msg}")
            return redirect(f"{frontend_url}/payment.html?error=true&message={error_msg}")
            
    except Exception as e:
        print(f"Error in VNPay return: {str(e)}")
        return redirect(f"{frontend_url}/payment.html?error=true&message=Unexpected+error")
        
# Helper function to get error message based on VNPay response code
def get_vnpay_error_message(response_code):
    """Get error message for VNPay response code"""
    
    error_messages = {
        '01': 'Giao dịch đã tồn tại',
        '02': 'Merchant không hợp lệ',
        '03': 'Dữ liệu gửi sang không đúng định dạng',
        '04': 'Khởi tạo giao dịch không thành công do Website đang bị tạm khóa',
        '05': 'Giao dịch không thành công do: Quý khách nhập sai mật khẩu quá số lần quy định',
        '06': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch',
        '07': 'Giao dịch bị nghi ngờ là giao dịch gian lận',
        '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ Internet Banking',
        '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán',
        '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
        '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch',
        '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
        '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
        '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
        '75': 'Ngân hàng thanh toán đang bảo trì',
        '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
        '99': 'Lỗi không xác định',
    }
    
    return error_messages.get(response_code, f'Lỗi không xác định (Mã: {response_code})')

@payment_bp.route('/vnpay/ipn', methods=['POST'])
def vnpay_ipn():
    """Handle VNPay IPN (Instant Payment Notification)"""
    
    try:
        # Get all form data
        params = request.form.to_dict()
        
        # Verify signature
        is_valid = VNPayService.verify_return_data(params)
        
        if not is_valid:
            return jsonify({
                'RspCode': '97',
                'Message': 'Invalid signature'
            })
        
        # Process payment result
        response_code = params.get('vnp_ResponseCode', '')
        txn_ref = params.get('vnp_TxnRef', '')
        amount = int(params.get('vnp_Amount', 0)) / 100
        
        if response_code == '00':
            # Payment successful - Update your database here
            print(f"Payment successful: {txn_ref}, Amount: {amount}")
            
            return jsonify({
                'RspCode': '00',
                'Message': 'Success'
            })
        else:
            # Payment failed
            print(f"Payment failed: {txn_ref}, Code: {response_code}")
            
            return jsonify({
                'RspCode': '00',
                'Message': 'Success'
            })
            
    except Exception as e:
        return jsonify({
            'RspCode': '99',
            'Message': str(e)
        })

@payment_bp.route('/test', methods=['GET'])
def test_payment():
    """Test endpoint for payment functionality"""
    
    return jsonify({
        'message': 'VNPay payment service is running',
        'endpoints': {
            'create_payment': '/api/payment/vnpay/create',
            'return_url': '/api/payment/vnpay/return',
            'ipn_url': '/api/payment/vnpay/ipn',
            'blockchain_create': '/api/payment/blockchain/create',
            'blockchain_status': '/api/payment/blockchain/status/<tx_hash>',
            'blockchain_confirm': '/api/payment/blockchain/confirm'
        },
        'status': 'OK'
    })


# ==================== BLOCKCHAIN PAYMENT ENDPOINTS ====================

class BlockchainService:
    """Service class for Blockchain (Ethereum/Sepolia) payment processing"""
    
    # Sepolia testnet configuration
    SEPOLIA_CHAIN_ID = '11155111'
    SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/'  # Can be configured via env
    
    @staticmethod
    def create_blockchain_payment_record(booking_id, amount, from_address):
        """Create a blockchain payment record in database"""
        try:
            from models.db import db, Payment, Booking
            
            # Create payment record with pending status
            payment = Payment(
                booking_id=booking_id,
                payment_method='blockchain',
                amount=amount,
                currency='VND',
                status='pending',
                transaction_type='ethereum',
                blockchain_from_address=from_address,
                blockchain_chain_id=BlockchainService.SEPOLIA_CHAIN_ID,
            )
            
            db.session.add(payment)
            db.session.commit()
            
            return {
                'success': True,
                'payment_id': payment.id,
                'status': 'pending'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def update_transaction_status(tx_hash, status, details=None):
        """Update blockchain transaction status"""
        try:
            from models.db import db, Payment
            
            payment = Payment.query.filter_by(blockchain_tx_hash=tx_hash).first()
            
            if not payment:
                return {'success': False, 'error': 'Transaction not found'}
            
            # Update payment status
            payment.status = status
            
            if details:
                if 'confirmations' in details:
                    payment.blockchain_confirmations = details['confirmations']
                if 'block_number' in details:
                    payment.blockchain_block_number = details['block_number']
                if 'gas_used' in details:
                    payment.blockchain_gas_used = details['gas_used']
                if 'error_code' in details:
                    payment.blockchain_error_code = details['error_code']
                if 'error_message' in details:
                    payment.blockchain_error_message = details['error_message']
            
            payment.updated_at = datetime.utcnow()
            db.session.commit()
            
            # If payment successful, update booking status
            if status == 'success' and payment.booking:
                payment.booking.status = 'confirmed'
                db.session.commit()
            
            return {
                'success': True,
                'status': status,
                'payment_data': payment.to_dict()
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def save_transaction_hash(booking_id, tx_hash, from_address, to_address):
        """Save transaction hash to database"""
        try:
            from models.db import db, Payment
            
            payment = Payment.query.filter_by(booking_id=booking_id, status='pending').first()
            
            if not payment:
                return {'success': False, 'error': 'Payment record not found'}
            
            # Update with transaction hash
            payment.blockchain_tx_hash = tx_hash
            payment.blockchain_from_address = from_address
            payment.blockchain_to_address = to_address
            payment.status = 'processing'
            payment.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'success': True,
                'tx_hash': tx_hash,
                'status': 'processing'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Blockchain Payment Routes

@payment_bp.route('/blockchain/create', methods=['POST'])
def create_blockchain_payment():
    """Create a blockchain payment record"""
    
    try:
        data = request.get_json()
        
        booking_id = data.get('bookingId')
        amount = data.get('amount')
        wallet_address = data.get('walletAddress')
        
        if not all([booking_id, amount, wallet_address]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: bookingId, amount, walletAddress'
            }), 400
        
        # Create payment record
        result = BlockchainService.create_blockchain_payment_record(
            booking_id, amount, wallet_address
        )
        
        return jsonify(result), 201 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@payment_bp.route('/blockchain/status/<tx_hash>', methods=['GET'])
def get_blockchain_transaction_status(tx_hash):
    """Get blockchain transaction status"""
    
    try:
        from models.db import db, Payment
        
        payment = Payment.query.filter_by(blockchain_tx_hash=tx_hash).first()
        
        if not payment:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404
        
        return jsonify({
            'success': True,
            'status': payment.status,
            'confirmations': payment.blockchain_confirmations or 0,
            'tx_hash': tx_hash,
            'payment_data': payment.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@payment_bp.route('/blockchain/confirm', methods=['POST'])
def confirm_blockchain_payment():
    """Confirm blockchain payment with transaction details"""
    
    try:
        data = request.get_json()
        
        tx_hash = data.get('txHash')
        status = data.get('status')  # success, failed, pending
        details = data.get('details', {})  # confirmations, block_number, gas_used, error_code
        
        if not all([tx_hash, status]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: txHash, status'
            }), 400
        
        # Update transaction status
        result = BlockchainService.update_transaction_status(tx_hash, status, details)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@payment_bp.route('/blockchain/save-hash', methods=['POST'])
def save_blockchain_transaction_hash():
    """Save blockchain transaction hash"""
    
    try:
        data = request.get_json()
        
        booking_id = data.get('bookingId')
        tx_hash = data.get('txHash')
        from_address = data.get('fromAddress')
        to_address = data.get('toAddress')
        
        if not all([booking_id, tx_hash, from_address]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        result = BlockchainService.save_transaction_hash(
            booking_id, tx_hash, from_address, to_address
        )
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def get_vnpay_error_message(response_code):
    """Get user-friendly error message from VNPay response code"""
    
    error_messages = {
        '01': 'Giao dịch chưa hoàn tất',
        '02': 'Giao dịch bị lỗi',
        '04': 'Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)',
        '05': 'VNPAY đang xử lý giao dịch này (GD hoàn tiền)',
        '06': 'VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)',
        '07': 'Giao dịch bị nghi ngờ gian lận',
        '09': 'GD Hoàn trả bị từ chối',
        '10': 'Đã giao hàng',
        '11': 'Giao dịch không thành công do: Khách hàng nhập sai mật khẩu xác thực giao dịch (OTP)',
        '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
        '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)',
        '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
        '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
        '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
        '75': 'Ngân hàng thanh toán đang bảo trì.',
        '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
        '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
    }
    
    return error_messages.get(response_code, f'Lỗi không xác định (Mã: {response_code})')

# Configuration check endpoint
@payment_bp.route('/config', methods=['GET'])
def check_config():
    """Check VNPay configuration"""
    
    return jsonify({
        'vnpay_configured': VNPayConfig.is_configured(),
        'tmn_code_set': VNPayConfig.TMN_CODE != "YOUR_TMN_CODE",
        'hash_secret_set': VNPayConfig.HASH_SECRET != "YOUR_HASH_SECRET",
        'environment': VNPayConfig.ENVIRONMENT,
        'payment_url': VNPayConfig.get_payment_url()
    })


@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid_compat():
    """Compatibility endpoint for local card/bank demo flow.
    Mirrors /api/payment/mark-paid behavior used by newer payment route module.
    """
    data = request.get_json(silent=True) or {}
    booking_code = data.get('booking_code')
    amount = data.get('amount')
    transaction_id = data.get('transaction_id')
    provider = data.get('provider', 'manual')

    if not booking_code:
        return jsonify({'success': False, 'message': 'booking_code is required'}), 400

    try:
        try:
            from backend.models.db import session_scope
            from backend.models.booking import Booking, BookingStatus
            from backend.models.payments import Payment
            from backend.models.user import User
        except Exception:
            from models.db import session_scope
            from models.booking import Booking, BookingStatus
            from models.payments import Payment
            from models.user import User

        # Resolve caller user from Bearer token (optional)
        caller_user = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                caller_user = User.verify_auth_token(token)
            except Exception:
                caller_user = None

        with session_scope() as session:
            booking = session.query(Booking).filter_by(booking_code=booking_code).first()
            if not booking:
                return jsonify({'success': False, 'message': 'Booking not found'}), 404

            if caller_user and getattr(booking, 'user_id', None) is None:
                booking.user_id = caller_user
                session.add(booking)

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
                transaction_id=transaction_id,
            )
            session.add(payment)

            try:
                booking.total_amount = amount_dec
            except Exception:
                pass

            try:
                booking.status = BookingStatus.CONFIRMED
            except Exception:
                booking.status = 'CONFIRMED'
            booking.confirmed_at = datetime.utcnow()
            session.add(booking)
            session.flush()

            return jsonify({
                'success': True,
                'booking_code': booking.booking_code,
                'payment': payment.as_dict() if hasattr(payment, 'as_dict') else {'id': payment.id}
            }), 200

    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500