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
            'ipn_url': '/api/payment/vnpay/ipn'
        },
        'status': 'OK'
    })

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