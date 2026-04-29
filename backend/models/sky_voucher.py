"""SKY voucher model for redeemed token discounts."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from .db import Base


class SkyVoucher(Base):
    __tablename__ = "sky_vouchers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    code = Column(String(40), unique=True, nullable=False, index=True)
    voucher_type = Column(String(20), nullable=False, default='fixed')
    redeem_type = Column(String(20), nullable=False, default='discount')
    value = Column(Numeric(12, 2), nullable=False)
    min_amount = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default='VND')
    description = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_used = Column(Boolean, nullable=False, default=False, index=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", backref="sky_vouchers")

    def as_dict(self):
        now = datetime.utcnow()
        is_expired = bool(self.expires_at and self.expires_at < now)
        return {
            'id': self.id,
            'user_id': self.user_id,
            'code': self.code,
            'type': self.voucher_type,
            'redeem_type': self.redeem_type,
            'value': float(self.value) if self.value is not None else 0,
            'min_amount': float(self.min_amount) if self.min_amount is not None else 0,
            'currency': self.currency,
            'description': self.description,
            'expires_at': self.expires_at.isoformat() + 'Z' if self.expires_at else None,
            'is_used': bool(self.is_used),
            'used_at': self.used_at.isoformat() + 'Z' if self.used_at else None,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'is_expired': is_expired,
        }
