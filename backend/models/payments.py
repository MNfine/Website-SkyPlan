"""Payment model definition."""
from __future__ import annotations

from datetime import datetime
from flask import jsonify, request
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from .db import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, index=True)
    booking_code = Column(String(32), nullable=False, index=True)  # Keep for backward compatibility
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    provider = Column(String(20), nullable=False, default="vnpay")
    transaction_id = Column(String(100), nullable=True, index=True)  # External payment ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")

    def as_dict(self):
        return {
            "id": self.id,
            "booking_code": self.booking_code,
            "amount": float(self.amount),
            "status": self.status,
            "provider": self.provider,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
