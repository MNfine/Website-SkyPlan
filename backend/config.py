"""
Configuration file for SkyPlan Backend
VNPay payment gateway settings
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file in root directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(root_dir, '.env')
load_dotenv(env_path)

class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'skyplan-secret-key-2025'
    DEBUG = True
    
    # CORS settings
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]

class VNPayConfig:
    """VNPay payment gateway configuration"""
    
    # VNPay Merchant Settings (Get from VNPay)
    TMN_CODE = os.environ.get('VNPAY_TMN_CODE') or 'YOUR_TMN_CODE'
    HASH_SECRET = os.environ.get('VNPAY_HASH_SECRET') or 'YOUR_HASH_SECRET'
    
    # VNPay URLs
    SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    PRODUCTION_URL = "https://vnpayment.vn/paymentv2/vpcpay.html"
    
    # Current environment (sandbox/production)
    ENVIRONMENT = os.environ.get('VNPAY_ENV') or 'sandbox'
    
    # Return URLs
    RETURN_URL = os.environ.get('VNPAY_RETURN_URL') or 'http://localhost:5000/api/payment/vnpay/return'
    
    @classmethod
    def get_payment_url(cls):
        """Get appropriate VNPay URL based on environment"""
        return cls.SANDBOX_URL if cls.ENVIRONMENT == 'sandbox' else cls.PRODUCTION_URL
    
    @classmethod
    def is_configured(cls):
        """Check if VNPay is properly configured"""
        return (cls.TMN_CODE != 'YOUR_TMN_CODE' and 
                cls.HASH_SECRET != 'YOUR_HASH_SECRET')

# Database configuration (for future use)
class DatabaseConfig:
    """Database configuration for storing booking/payment data"""
    
    # SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///skyplan.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# Email configuration (for booking confirmations)
class EmailConfig:
    """Email configuration for sending booking confirmations"""
    
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'noreply@skyplan.com'