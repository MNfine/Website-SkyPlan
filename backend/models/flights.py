"""Flight model definition for SkyPlan."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric
from sqlalchemy.orm import relationship
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
    
    # Relationships - use lazy loading to avoid initialization issues
    seats = relationship("Seat", back_populates="flight", cascade="all, delete-orphan", lazy="select")

    def as_dict(self):
        return {
            "id": self.id,
            "flight_number": self.flight_number,
            "airline": self.airline,
            "airline_name": self.airline,  # Alias for frontend compatibility
            "departure_airport": self.departure_airport,
            "arrival_airport": self.arrival_airport,
            "origin_code": self.departure_airport,  # Alias for frontend compatibility
            "destination_code": self.arrival_airport,  # Alias for frontend compatibility
            "departure_time": self.departure_time.isoformat() if self.departure_time else None,
            "arrival_time": self.arrival_time.isoformat() if self.arrival_time else None,
            "price": float(self.price),
            "seats_available": self.seats_available,
        }
    
    def get_available_seat_count(self):
        """Get number of available seats."""
        from .seats import SeatStatus
        return len([s for s in self.seats if s.status == SeatStatus.AVAILABLE.value])
    
    def initialize_seats_for_aircraft(self, aircraft_type="A320"):
        """Initialize seat layout for this flight."""
        from .seats import Seat, SeatClass
        
        seats = []
        
        # A320 configuration: 28 rows, 6 seats per row (A,B,C,D,E,F)  
        if aircraft_type == "A320":
            for row in range(1, 29):  # Rows 1-28
                for letter in ['A', 'B', 'C', 'D', 'E', 'F']:
                    seat_number = f"{row}{letter}"
                    
                    # Determine seat class based on row
                    if row <= 3:
                        seat_class = SeatClass.BUSINESS.value
                        price_modifier = 500000  # +500k for business
                    elif row <= 8:
                        seat_class = SeatClass.PREMIUM.value  
                        price_modifier = 200000  # +200k for premium
                    else:
                        seat_class = SeatClass.ECONOMY.value
                        price_modifier = 0
                    
                    # Window seats cost extra
                    if letter in ['A', 'F']:
                        price_modifier += 50000  # +50k for window
                    
                    seat = {
                        'flight_id': self.id,
                        'seat_number': seat_number,
                        'seat_class': seat_class,
                        'price_modifier': price_modifier,
                        'status': 'AVAILABLE'
                    }
                    seats.append(seat)
        
        return seats
