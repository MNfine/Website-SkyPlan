"""Flight model definition for SkyPlan."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric
from .db import Base

class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String(20), nullable=False, index=True)
    airline = Column(String(50), nullable=False)
    departure_airport = Column(String(10), nullable=False, index=True)
    arrival_airport = Column(String(10), nullable=False, index=True)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    seats_available = Column(Integer, nullable=False, default=0)

    def as_dict(self):
        return {
            "id": self.id,
            "flight_number": self.flight_number,
            "airline": self.airline,
            "departure_airport": self.departure_airport,
            "arrival_airport": self.arrival_airport,
            "departure_time": self.departure_time.isoformat() if self.departure_time else None,
            "arrival_time": self.arrival_time.isoformat() if self.arrival_time else None,
            "price": float(self.price),
            "seats_available": self.seats_available,
        }
