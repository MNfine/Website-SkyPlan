"""
SkyPlan ORM Models using SQLAlchemy
Defines database models for users, bookings, payments, and tickets
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    """User model for storing customer information and wallet addresses"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    wallet_address = db.Column(db.String(42))  # Ethereum address format
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'


class Booking(db.Model):
    """Booking model for flight reservations"""
    __tablename__ = 'bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    booking_code = db.Column(db.String(20), unique=True, nullable=False)
    flight_code = db.Column(db.String(50), nullable=False)
    departure_city = db.Column(db.String(100))
    arrival_city = db.Column(db.String(100))
    departure_date = db.Column(db.Date)
    arrival_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, cancelled
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='VND')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payments = db.relationship('Payment', backref='booking', lazy=True, cascade='all, delete-orphan')
    tickets = db.relationship('Ticket', backref='booking', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Booking {self.booking_code}>'


class Payment(db.Model):
    """Payment model for tracking all payment transactions (VNPay, Blockchain, Card, etc)"""
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    payment_method = db.Column(db.String(20), nullable=False)  # vnpay, card, bank, ewallet, blockchain
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='VND')
    status = db.Column(db.String(20), default='pending')  # pending, processing, success, failed
    transaction_type = db.Column(db.String(50))  # For blockchain: ethereum, usdc, etc.
    
    # VNPay specific fields
    vnp_txn_ref = db.Column(db.String(50))
    vnp_response_code = db.Column(db.String(10))
    
    # Blockchain specific fields
    blockchain_tx_hash = db.Column(db.String(66), unique=True)  # 0x + 64 hex chars
    blockchain_from_address = db.Column(db.String(42))  # Ethereum address
    blockchain_to_address = db.Column(db.String(42))  # Contract/Receiver address
    blockchain_chain_id = db.Column(db.String(20))  # 11155111 for Sepolia
    blockchain_gas_used = db.Column(db.Integer)
    blockchain_gas_price = db.Column(db.Numeric(20, 0))  # Wei
    blockchain_nonce = db.Column(db.Integer)
    blockchain_confirmations = db.Column(db.Integer, default=0)
    blockchain_block_number = db.Column(db.Integer)
    blockchain_error_code = db.Column(db.String(50))  # reject, insufficient_gas, rpc_error
    blockchain_error_message = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Payment {self.id} - {self.payment_method}>'
    
    def to_dict(self):
        """Convert payment record to dictionary for JSON response"""
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'payment_method': self.payment_method,
            'amount': float(self.amount),
            'currency': self.currency,
            'status': self.status,
            'transaction_type': self.transaction_type,
            'blockchain_tx_hash': self.blockchain_tx_hash,
            'blockchain_from_address': self.blockchain_from_address,
            'blockchain_chain_id': self.blockchain_chain_id,
            'blockchain_confirmations': self.blockchain_confirmations,
            'blockchain_error_code': self.blockchain_error_code,
            'blockchain_error_message': self.blockchain_error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Ticket(db.Model):
    """Ticket model for storing flight tickets after successful payment"""
    __tablename__ = 'tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    ticket_number = db.Column(db.String(50), unique=True, nullable=False)
    passenger_name = db.Column(db.String(100), nullable=False)
    passenger_email = db.Column(db.String(120))
    seat_number = db.Column(db.String(10))
    status = db.Column(db.String(20), default='confirmed')  # confirmed, cancelled
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Ticket {self.ticket_number}>'


# Export models for import in app.py
__all__ = ['db', 'User', 'Booking', 'Payment', 'Ticket']
