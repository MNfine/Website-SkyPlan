"""Ticket model for managing flight tickets with unique codes."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
import random
import string

from .db import Base


class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(20), unique=True, nullable=False, index=True)  # "SKY240125ABC123"
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=False)
    passenger_id = Column(Integer, ForeignKey('booking_passengers.id'), nullable=False)
    flight_id = Column(Integer, ForeignKey('flights.id'), nullable=False)
    seat_id = Column(Integer, ForeignKey('seats.id'), nullable=True)
    
    # Passenger information (stored for ticket)
    passenger_name = Column(String(100), nullable=False)
    passenger_phone = Column(String(20), nullable=True)
    passenger_email = Column(String(100), nullable=True)
    passenger_id_number = Column(String(20), nullable=True)
    
    # Ticket pricing
    base_price = Column(Numeric(12, 2), nullable=False)
    seat_fee = Column(Numeric(10, 2), default=0)
    total_price = Column(Numeric(12, 2), nullable=False)
    
    # Status tracking
    status = Column(String(20), default="ISSUED", nullable=False)  # ISSUED, USED, CANCELLED, REFUNDED
    
    # Timestamps
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    used_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Check-in information
    checked_in = Column(String(1), default="N", nullable=False)  # Y/N
    check_in_at = Column(DateTime, nullable=True)
    boarding_pass_issued = Column(String(1), default="N", nullable=False)  # Y/N
    
    # Relationships
    booking = relationship("Booking", back_populates="tickets")
    passenger = relationship("BookingPassenger", back_populates="ticket")
    flight = relationship("Flight")
    seat = relationship("Seat")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_ticket_booking_flight', 'booking_id', 'flight_id'),
        Index('idx_ticket_status_issued', 'status', 'issued_at'),
        Index('idx_ticket_flight_date', 'flight_id', 'issued_at'),
    )
    
    @classmethod
    def generate_ticket_code(cls, flight_id: int) -> str:
        """Generate unique ticket code format: SKY + YYMMDD + 6 random chars."""
        date_part = datetime.now().strftime("%y%m%d")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"SKY{date_part}{random_part}"
    
    @classmethod
    def create_ticket(cls, booking_id: int, passenger_id: int, flight_id: int, 
                     seat_id: int, passenger_name: str, base_price: float, 
                     seat_fee: float = 0, **passenger_info) -> 'Ticket':
        """Create new ticket with unique code."""
        ticket_code = cls.generate_ticket_code(flight_id)
        
        # Ensure unique ticket code
        max_attempts = 10
        attempt = 0
        while attempt < max_attempts:
            from .db import get_session
            session = get_session()
            try:
                existing = session.query(cls).filter_by(ticket_code=ticket_code).first()
                if not existing:
                    break
                ticket_code = cls.generate_ticket_code(flight_id)
                attempt += 1
            finally:
                session.close()
        
        return cls(
            ticket_code=ticket_code,
            booking_id=booking_id,
            passenger_id=passenger_id,
            flight_id=flight_id,
            seat_id=seat_id,
            passenger_name=passenger_name,
            passenger_phone=passenger_info.get('phone'),
            passenger_email=passenger_info.get('email'),
            passenger_id_number=passenger_info.get('id_number'),
            base_price=base_price,
            seat_fee=seat_fee,
            total_price=base_price + seat_fee,
            status="ISSUED"
        )
    
    def cancel_ticket(self) -> None:
        """Cancel this ticket."""
        self.status = "CANCELLED"
        self.cancelled_at = datetime.utcnow()
    
    def use_ticket(self) -> None:
        """Mark ticket as used (passenger boarded)."""
        self.status = "USED"
        self.used_at = datetime.utcnow()
    
    def check_in_passenger(self) -> None:
        """Check in passenger and issue boarding pass."""
        self.checked_in = "Y"
        self.check_in_at = datetime.utcnow()
        self.boarding_pass_issued = "Y"
    
    def get_ticket_info(self) -> dict:
        """Get complete ticket information for display."""
        return {
            "ticket_code": self.ticket_code,
            "passenger_name": self.passenger_name,
            "flight_id": self.flight_id,
            "seat_number": self.seat.seat_number if self.seat else None,
            "seat_class": self.seat.seat_class if self.seat else None,
            "base_price": float(self.base_price),
            "seat_fee": float(self.seat_fee),
            "total_price": float(self.total_price),
            "status": self.status,
            "issued_at": self.issued_at.isoformat() if self.issued_at else None,
            "checked_in": self.checked_in == "Y",
            "boarding_pass_issued": self.boarding_pass_issued == "Y"
        }
    
    def __repr__(self):
        return f"<Ticket {self.ticket_code} for {self.passenger_name} on Flight {self.flight_id}>"