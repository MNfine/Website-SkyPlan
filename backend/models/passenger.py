"""Passenger model to store passenger information per user."""
from __future__ import annotations

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from .db import Base


class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)  # Allow NULL for guest bookings

    lastname = Column(String(100), nullable=False)
    firstname = Column(String(100), nullable=False)
    cccd = Column(String(20), nullable=False, index=True)
    dob = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)
    phone_number = Column(String(20), nullable=False)
    email = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    nationality = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def as_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "lastname": self.lastname,
            "firstname": self.firstname,
            "cccd": self.cccd,
            "dob": self.dob.isoformat() if isinstance(self.dob, date) else None,
            "gender": self.gender,
            "phone_number": self.phone_number,
            "email": self.email,
            "address": self.address,
            "city": self.city,
            "nationality": self.nationality,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
