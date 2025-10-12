"""
Script to import flight data from CSV into the flights table (PostgreSQL).
Run this script once after creating the flights table and model.
"""

import csv
from datetime import datetime
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

def import_flights(clear_existing=True):
    # Mở session để thực hiện các thao tác với database
    with session_scope() as session:
        # Xóa dữ liệu cũ nếu được yêu cầu
        if clear_existing:
            from sqlalchemy import text
            # Đếm số lượng bản ghi trước khi xóa
            old_count = session.execute(text('SELECT COUNT(*) FROM flights')).scalar()
            print(f"Tìm thấy {old_count} chuyến bay hiện có trong database.")
            
            # Xóa tất cả dữ liệu trong bảng flights
            session.execute(text('DELETE FROM flights'))
            session.commit()
            print(f"Đã xóa tất cả {old_count} chuyến bay cũ.")
        
        # Đọc dữ liệu từ file CSV
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
                    flights.append(flight)
                except Exception as e:
                    print(f"Bỏ qua dòng lỗi: {row}\nLý do: {e}")
            
            # Thêm dữ liệu mới vào database
            if flights:
                print(f"Đang import {len(flights)} chuyến bay mới...")
                session.bulk_save_objects(flights)
                session.commit()
                
                # Kiểm tra lại số lượng bản ghi thực tế trong bảng flights
                new_count = session.execute(text('SELECT COUNT(*) FROM flights')).scalar()
                print(f"Hoàn tất! Đã import {len(flights)} chuyến bay. Số lượng thực tế trong bảng: {new_count}")
            else:
                print("Không có chuyến bay nào được import.")

if __name__ == '__main__':
    import argparse
    
    # Tạo parser để xử lý các tham số dòng lệnh
    parser = argparse.ArgumentParser(description='Import flight data from CSV to database')
    parser.add_argument('--keep-existing', action='store_true', 
                        help='Không xóa dữ liệu hiện có, chỉ thêm mới (mặc định: xóa dữ liệu cũ)')
    
    # Parse tham số từ dòng lệnh
    args = parser.parse_args()
    
    # Gọi hàm import_flights với tham số tương ứng
    import_flights(clear_existing=not args.keep_existing)
