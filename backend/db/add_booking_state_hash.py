"""Add and backfill booking_state_hash for existing bookings."""
from __future__ import annotations

from sqlalchemy.orm import joinedload
from sqlalchemy import text

from backend.models.db import engine, session_scope
from backend.models.user import User  # noqa: F401
from backend.models.flights import Flight  # noqa: F401
from backend.models.passenger import Passenger  # noqa: F401
from backend.models.payments import Payment  # noqa: F401
from backend.models.seats import Seat  # noqa: F401
from backend.models.tickets import Ticket  # noqa: F401
from backend.models.booking import Booking, BookingPassenger  # noqa: F401
from backend.utils.blockchain import generate_booking_state_hash


def main() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_state_hash VARCHAR(66)"))

    updated = 0
    with session_scope() as session:
        bookings = session.query(Booking).options(
            joinedload(Booking.passengers).joinedload(BookingPassenger.passenger),
            joinedload(Booking.outbound_flight),
            joinedload(Booking.inbound_flight),
        ).all()

        for booking in bookings:
            state_hash = generate_booking_state_hash(booking)
            if booking.booking_state_hash != state_hash:
                booking.booking_state_hash = state_hash
                if not booking.booking_hash:
                    booking.booking_hash = state_hash
                updated += 1

    print(f"✅ Added booking_state_hash and backfilled {updated} booking rows")


if __name__ == "__main__":
    main()
