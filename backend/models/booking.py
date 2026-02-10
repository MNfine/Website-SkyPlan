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
        # Provide a richer representation expected by the frontend
        outbound = None
        inbound = None
        try:
            if self.outbound_flight:
                # include both the flight's keys and aliases some front-end code expects
                outbound = self.outbound_flight.as_dict()
                outbound.setdefault('origin_code', outbound.get('departure_airport'))
                outbound.setdefault('destination_code', outbound.get('arrival_airport'))
            if self.inbound_flight:
                inbound = self.inbound_flight.as_dict()
                inbound.setdefault('origin_code', inbound.get('departure_airport'))
                inbound.setdefault('destination_code', inbound.get('arrival_airport'))
        except Exception:
            # If lazy relationships are not loaded or something fails, fall back to ids
            outbound = outbound or { 'id': self.outbound_flight_id }
            inbound = inbound or ( { 'id': self.inbound_flight_id } if self.inbound_flight_id else None )

        # Build passenger list (include passenger details and seat info when available)
        passenger_list = []
        try:
            for bp in getattr(self, 'passengers') or []:
                p = None
                try:
                    p = bp.passenger.as_dict() if bp.passenger else None
                except Exception:
                    p = { 'id': bp.passenger_id }
                # ensure we always have a dict and include seat/name aliases
                if p is None:
                    p = { 'id': bp.passenger_id }

                # normalize passenger fields for frontend expectations
                if getattr(bp, 'seat_number', None):
                    p['seat_number'] = bp.seat_number
                    p['seatNumber'] = bp.seat_number

                # provide full name aliases used across frontend
                try:
                    firstname = p.get('firstname') or p.get('firstName') or ''
                    lastname = p.get('lastname') or p.get('lastName') or ''
                    full = (firstname + ' ' + lastname).strip() if (firstname or lastname) else p.get('full_name') or p.get('fullName') or ''
                    if full:
                        p['full_name'] = full
                        p['fullName'] = full
                except Exception:
                    pass

                # phone alias
                if 'phone_number' in p and 'phone' not in p:
                    p['phone'] = p.get('phone_number')

                passenger_list.append(p)
        except Exception:
            passenger_list = []

        return {
            "id": self.id,
            "booking_code": self.booking_code,
            "user_id": self.user_id,
            # Use enum names so frontend that expects UPPER_CASE tokens works consistently
            "status": (self.status.name if self.status else None),
            # provide passenger counts in several alias forms for frontend compatibility
            "passenger_count": len(passenger_list),
            "total_passengers": len(passenger_list),
            "num_passengers": len(passenger_list),
            "trip_type": (self.trip_type.name if self.trip_type else None),
            "fare_class": (self.fare_class.name if self.fare_class else None),
            "outbound_flight": outbound,
            "inbound_flight": inbound,
            "outbound_flight_id": self.outbound_flight_id,
            "inbound_flight_id": self.inbound_flight_id,
            "total_amount": float(self.total_amount) if self.total_amount is not None else 0,
            "passengers": passenger_list,
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