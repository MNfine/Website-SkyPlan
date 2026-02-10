from backend.models.db import init_db
from backend.models.payments import Payment
from backend.models.flights import Flight  

if __name__ == '__main__':
    init_db()
    print("All tables created.")
