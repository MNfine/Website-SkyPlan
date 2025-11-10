"""
Script to import flight data from CSV into the flights table (PostgreSQL).
Improved version that checks for existing data and only imports new flights.
"""

import csv
import sys
import os
from datetime import datetime
from sqlalchemy import and_

# Add project root to path so we can import backend modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

try:
    from backend.models.db import session_scope
    from backend.models.flights import Flight
except ImportError as e:
    print(f"❌ Error importing models: {e}")
    print("Make sure you're running from the project root directory")
    sys.exit(1)

CSV_FILE = 'backend/db/demo_flights_vn_airport_names.csv'

def parse_datetime(date_str, time_str):
    # date_str: '2025-10-01', time_str: '05:45'
    dt_str = f"{date_str} {time_str}"
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(dt_str, fmt)
        except Exception:
            continue
    raise ValueError(f"Unrecognized datetime format: {dt_str}")

def check_existing_flight(session, flight_number, departure_airport, arrival_airport, departure_time):
    """
    Check if a flight already exists in database based on unique combination:
    flight_number + departure_airport + arrival_airport + departure_time
    """
    existing = session.query(Flight).filter(
        and_(
            Flight.flight_number == flight_number,
            Flight.departure_airport == departure_airport,
            Flight.arrival_airport == arrival_airport,
            Flight.departure_time == departure_time
        )
    ).first()
    return existing is not None

def import_flights():
    print("🚀 Starting flight data import...")
    
    # First, check current database state
    with session_scope() as session:
        from sqlalchemy import text
        existing_count = session.execute(text('SELECT COUNT(*) FROM flights')).scalar()
        print(f"📊 Current flights in database: {existing_count}")
    
    skipped_duplicates = 0
    skipped_errors = 0
    imported_flights = []
    
    with open(CSV_FILE, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        total_rows = 0
        
        with session_scope() as session:
            for row in reader:
                total_rows += 1
                try:
                    # Xử lý trường hợp BOM ở header
                    flight_number = row.get('flight_number') or row.get('\ufeffflight_number')
                    if not flight_number:
                        raise ValueError('flight_number is missing')
                    
                    departure_time = parse_datetime(row['date'], row['depart_time_local'])
                    arrival_time = parse_datetime(row['date'], row['arrive_time_local'])
                    
                    # Check if this exact flight already exists
                    if check_existing_flight(session, flight_number, row['from'], row['to'], departure_time):
                        print(f"⏭️  Skipping duplicate: {flight_number} {row['from']}→{row['to']} on {row['date']}")
                        skipped_duplicates += 1
                        continue
                    
                    # Create new flight
                    flight = Flight(
                        flight_number=flight_number,
                        airline=row['airline'],
                        departure_airport=row['from'],
                        arrival_airport=row['to'],
                        departure_time=departure_time,
                        arrival_time=arrival_time,
                        price=float(row['price']),
                        seats_available=180  # Default seat count
                    )
                    
                    imported_flights.append(flight)
                    print(f"✅ Adding: {flight_number} {row['from']}→{row['to']} on {row['date']} at {row['depart_time_local']}")
                    
                except Exception as e:
                    print(f"❌ Skipping invalid row {total_rows}: {e}")
                    print(f"   Data: {dict(row)}")
                    skipped_errors += 1
                    continue
            
            # Bulk insert all new flights
            if imported_flights:
                session.bulk_save_objects(imported_flights)
                session.commit()
                print(f"💾 Bulk inserted {len(imported_flights)} flights")
            
            # Final count check
            final_count = session.execute(text('SELECT COUNT(*) FROM flights')).scalar()
            
    print(f"\n📈 Import Summary:")
    print(f"   Total rows processed: {total_rows}")
    print(f"   Successfully imported: {len(imported_flights)}")
    print(f"   Skipped (duplicates): {skipped_duplicates}")
    print(f"   Skipped (errors): {skipped_errors}")
    print(f"   Database before: {existing_count}")
    print(f"   Database after: {final_count}")
    print(f"   Net increase: {final_count - existing_count}")

if __name__ == '__main__':
    import_flights()
