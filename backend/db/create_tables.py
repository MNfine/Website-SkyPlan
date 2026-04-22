from backend.models.db import init_db

# Import all models to register them with SQLAlchemy
from backend.models.user import User
from backend.models.flights import Flight
from backend.models.passenger import Passenger
from backend.models.booking import Booking, BookingPassenger
from backend.models.payments import Payment
from backend.models.seats import Seat
from backend.models.tickets import Ticket
from backend.models.sky_voucher import SkyVoucher

if __name__ == '__main__':
    print("Creating all tables in database...")
    init_db()
    print("✅ All tables created successfully!")
