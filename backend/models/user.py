"""User model definition for authentication."""
from __future__ import annotations

import os
import jwt
from datetime import datetime, timedelta
from flask import current_app
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from werkzeug.security import generate_password_hash, check_password_hash

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def set_password(self, password):
        """Hash the password and store it in the database."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def generate_auth_token(self, expires_in=86400):
        """Generate a JWT token for authentication."""
        secret_key = current_app.config.get('SECRET_KEY') or os.environ.get('SECRET_KEY', 'dev-key-change-me')
        
        payload = {
            'id': self.id,
            'email': self.email,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in)
        }
        
        return jwt.encode(payload, secret_key, algorithm='HS256')

    @staticmethod
    def verify_auth_token(token):
        """Verify the JWT token and return the user ID."""
        secret_key = current_app.config.get('SECRET_KEY') or os.environ.get('SECRET_KEY', 'dev-key-change-me')
        
        try:
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return payload['id']
        except jwt.ExpiredSignatureError:
            return None  # Token expired
        except jwt.InvalidTokenError:
            return None  # Invalid token

    def as_dict(self):
        """Convert user to dictionary (without sensitive data)."""
        return {
            "id": self.id,
            "fullname": self.fullname,
            "email": self.email,
            "phone": self.phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }