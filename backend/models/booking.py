"""Booking model to store flight booking information."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from .db import Base


class BookingStatus(enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PAYMENT_FAILED = "PAYMENT_FAILED"  # Thanh toán thất bại, có thể retry
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    COMPLETED = "COMPLETED"


class TripType(enum.Enum):
    ONE_WAY = "one-way"
    ROUND_TRIP = "round-trip"


class FareClass(enum.Enum):
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium-economy"
    BUSINESS = "business"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.PENDING, index=True)
    trip_type = Column(Enum(TripType), nullable=False)
    fare_class = Column(Enum(FareClass), nullable=False)
    
    # Flight information
    outbound_flight_id = Column(Integer, ForeignKey('flights.id'), nullable=False)
    inbound_flight_id = Column(Integer, ForeignKey('flights.id'), nullable=True)
    
    # Pricing
    total_amount = Column(Numeric(12, 2), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="bookings")
    outbound_flight = relationship("Flight", foreign_keys=[outbound_flight_id])
    inbound_flight = relationship("Flight", foreign_keys=[inbound_flight_id])
    passengers = relationship("BookingPassenger", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="booking", cascade="all, delete-orphan")

    def as_dict(self):
        return {
            "id": self.id,
            "booking_code": self.booking_code,
            "user_id": self.user_id,
            "status": self.status.value if self.status else None,
            "trip_type": self.trip_type.value if self.trip_type else None,
            "fare_class": self.fare_class.value if self.fare_class else None,
            "outbound_flight_id": self.outbound_flight_id,
            "inbound_flight_id": self.inbound_flight_id,
            "total_amount": float(self.total_amount) if self.total_amount else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
        }

    @staticmethod
    def generate_booking_code():
        """Generate unique booking code like SP2025001"""
        import random
        year = datetime.now().year
        random_suffix = str(random.randint(10000, 99999))
        return f"SP{year}{random_suffix}"


class BookingPassenger(Base):
    __tablename__ = "booking_passengers"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, index=True)
    passenger_id = Column(Integer, ForeignKey('passengers.id', ondelete='CASCADE'), nullable=False, index=True)
    seat_id = Column(Integer, ForeignKey('seats.id'), nullable=True, index=True)  # Link to seat table
    seat_number = Column(String(10), nullable=True)  # Backup seat number (legacy support)
    
    # Relationships
    booking = relationship("Booking", back_populates="passengers")
    passenger = relationship("Passenger", backref="booking_passengers")
    seat = relationship("Seat", foreign_keys=[seat_id])
    ticket = relationship("Ticket", back_populates="passenger", uselist=False)

    def as_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "passenger_id": self.passenger_id,
            "seat_number": self.seat_number,
        }