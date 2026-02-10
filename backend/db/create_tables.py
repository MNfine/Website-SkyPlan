import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.models.db import init_db
# Import all models to ensure relationships are registered
from backend.models.user import User
from backend.models.flights import Flight
from backend.models.seats import Seat
from backend.models.booking import Booking
from backend.models.passenger import Passenger
from backend.models.tickets import Ticket
from backend.models.payments import Payment

if __name__ == '__main__':
    init_db()
    print("✅ All tables created successfully!")
