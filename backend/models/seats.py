"""Seat model for flight seat management."""
from __future__ import annotations

from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
import enum

from .db import Base


class SeatStatus(enum.Enum):
    AVAILABLE = "AVAILABLE"
    TEMPORARILY_RESERVED = "TEMPORARILY_RESERVED"  
    CONFIRMED = "CONFIRMED"
    BLOCKED = "BLOCKED"


class SeatClass(enum.Enum):
    ECONOMY = "ECONOMY"
    PREMIUM = "PREMIUM"
    BUSINESS = "BUSINESS"


class Seat(Base):
    __tablename__ = "seats"
    
    id = Column(Integer, primary_key=True, index=True)
    flight_id = Column(Integer, ForeignKey('flights.id'), nullable=False)
    seat_number = Column(String(10), nullable=False)  # "1A", "12F", "23C"
    seat_class = Column(String(20), nullable=False, default="ECONOMY")
    status = Column(String(20), nullable=False, default="AVAILABLE")
    price_modifier = Column(Numeric(10,2), default=0)  # Extra cost for premium seats
    
    # Temporary reservation fields
    reserved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    reserved_at = Column(DateTime, nullable=True)
    reserved_until = Column(DateTime, nullable=True)
    
    # Final confirmation
    confirmed_booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    flight = relationship("Flight", back_populates="seats")
    reserved_user = relationship("User", foreign_keys=[reserved_by])
    confirmed_booking = relationship("Booking", foreign_keys=[confirmed_booking_id])
    
    # Indexes and constraints
    __table_args__ = (
        Index('idx_flight_seat_unique', 'flight_id', 'seat_number', unique=True),
        Index('idx_seats_flight_status', 'flight_id', 'status'),
        Index('idx_seats_reserved_until', 'reserved_until'),
        Index('idx_seats_reserved_by', 'reserved_by'),
    )
    
    def is_available_for_user(self, user_id):
        """Check if seat is available for selection by this user."""
        if self.status == SeatStatus.AVAILABLE.value:
            return True
        elif self.status == SeatStatus.TEMPORARILY_RESERVED.value:
            # Available if reserved by same user or reservation expired
            if self.reserved_by == user_id:
                return True
            if self.reserved_until and datetime.utcnow() > self.reserved_until:
                return True
        return False
    
    def reserve_temporarily(self, user_id, minutes=5):
        """Reserve seat temporarily for user."""
        self.status = SeatStatus.TEMPORARILY_RESERVED.value
        self.reserved_by = user_id
        self.reserved_at = datetime.utcnow()
        self.reserved_until = datetime.utcnow() + timedelta(minutes=minutes)
    
    def confirm_reservation(self, booking_id):
        """Confirm seat reservation for booking."""
        self.status = SeatStatus.CONFIRMED.value
        self.confirmed_booking_id = booking_id
        self.reserved_by = None
        self.reserved_at = None
        self.reserved_until = None
    
    def release_reservation(self):
        """Release temporary reservation."""
        self.status = SeatStatus.AVAILABLE.value
        self.reserved_by = None
        self.reserved_at = None
        self.reserved_until = None
        self.confirmed_booking_id = None
    
    @property
    def is_window_seat(self):
        """Check if this is a window seat."""
        return self.seat_number[-1] in ['A', 'F']  # Basic detection
    
    @property
    def is_aisle_seat(self):
        """Check if this is an aisle seat."""
        return self.seat_number[-1] in ['C', 'D']  # Basic detection
    
    def as_dict(self):
        return {
            "id": self.id,
            "flight_id": self.flight_id,
            "seat_number": self.seat_number,
            "seat_class": self.seat_class,
            "status": self.status,
            "price_modifier": float(self.price_modifier or 0),
            "reserved_until": self.reserved_until.isoformat() if self.reserved_until else None,
            "is_window": self.is_window_seat,
            "is_aisle": self.is_aisle_seat,
            "reserved_by_current_user": False  # Will be set by API
        }