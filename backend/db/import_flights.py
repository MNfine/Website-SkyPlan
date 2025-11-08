"""
Script to import flight data from CSV into the flights table (PostgreSQL).
Run this script once after creating the flights table and model.
"""

import csv
import sys
import os
from datetime import datetime

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.db import session_scope
from backend.models.flights import Flight

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

def import_flights():
    with open(CSV_FILE, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        flights = []
        for row in reader:
            try:
                # Xử lý trường hợp BOM ở header
                flight_number = row.get('flight_number') or row.get('\ufeffflight_number')
                if not flight_number:
                    raise ValueError('flight_number is missing')
                departure_time = parse_datetime(row['date'], row['depart_time_local'])
                arrival_time = parse_datetime(row['date'], row['arrive_time_local'])
                flight = Flight(
                    flight_number=flight_number,
                    airline=row['airline'],
                    departure_airport=row['from'],
                    arrival_airport=row['to'],
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    price=float(row['price']),
                    seats_available=180  # hoặc số ghế mặc định, vì file không có trường này
                )
                print(row)  # DEBUG: in ra dòng hợp lệ trước khi thêm
                flights.append(flight)
            except Exception as e:
                print(f"Bỏ qua dòng lỗi: {row}\nLý do: {e}")
        with session_scope() as session:
            session.bulk_save_objects(flights)
            session.commit()
            # Kiểm tra lại số lượng bản ghi thực tế trong bảng flights
            from sqlalchemy import text
            count = session.execute(text('SELECT COUNT(*) FROM flights')).scalar()
            print(f"Imported {len(flights)} flights. Số lượng thực tế trong bảng: {count}")

if __name__ == '__main__':
    import_flights()
