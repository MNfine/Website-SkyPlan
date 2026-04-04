"""
Script tạo seats cho tất cả flights trong database.
"""

import sys
import os
from datetime import datetime
from sqlalchemy import text
from contextlib import contextmanager

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

from backend.models.db import SessionLocal

@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def create_all_seats():
    """Tạo seats cho tất cả flights."""
    print("🛠️  TẠO SEATS CHO TẤT CẢ FLIGHTS")
    print("=" * 50)
    
    with session_scope() as session:
        # Đếm tổng số flights
        total_flights = session.execute(text('SELECT COUNT(*) FROM flights')).scalar()
        existing_seats_flights = session.execute(text('''
            SELECT COUNT(DISTINCT flight_id) FROM seats
        ''')).scalar()
        
        print(f"📊 Total flights: {total_flights}")
        print(f"📊 Flights with seats: {existing_seats_flights}")
        print(f"📊 Flights need seats: {total_flights - existing_seats_flights}")
        
        # Lấy flights chưa có seats (batch processing)
        batch_size = 50
        total_seats_created = 0
        batch_number = 0
        
        while True:
            # Query lại từ đầu mỗi lần (không dùng OFFSET vì dữ liệu thay đổi sau mỗi batch)
            flights = session.execute(text("""
                SELECT f.id, f.flight_number
                FROM flights f
                LEFT JOIN seats s ON f.id = s.flight_id
                WHERE s.flight_id IS NULL
                ORDER BY f.id
                LIMIT :batch_size
            """), {'batch_size': batch_size}).fetchall()
            
            if not flights:
                break
            
            batch_number += 1
            print(f"\n🔄 Processing batch {batch_number}: {len(flights)} flights...")
            
            batch_seats = 0
            for i, flight in enumerate(flights, 1):
                seats_for_flight = create_seats_for_flight(session, flight.id, flight.flight_number)
                batch_seats += seats_for_flight
                
                # Progress indicator
                if i % 10 == 0:
                    print(f"  📈 Processed {i}/{len(flights)} flights in batch...")
            
            total_seats_created += batch_seats
            print(f"  ✅ Created {batch_seats} seats in this batch")
            
            # Commit batch
            session.commit()
        
        print(f"\n🎉 HOÀN THÀNH!")
        print(f"   - Total seats created: {total_seats_created:,}")
        
        # Final statistics
        final_stats = session.execute(text("""
            SELECT 
                COUNT(DISTINCT f.id) as total_flights,
                COUNT(DISTINCT s.flight_id) as flights_with_seats,
                COUNT(s.id) as total_seats
            FROM flights f
            LEFT JOIN seats s ON f.id = s.flight_id
        """)).fetchone()
        
        print(f"   - Total flights: {final_stats.total_flights}")
        print(f"   - Flights with seats: {final_stats.flights_with_seats}")
        print(f"   - Total seats: {final_stats.total_seats:,}")

def create_seats_for_flight(session, flight_id, flight_number):
    """Tạo seats cho một flight."""
    seat_letters = ['A', 'B', 'C', 'D', 'E', 'F']
    rows_per_flight = 30  # 180 seats
    
    seats_created = 0
    for row in range(1, rows_per_flight + 1):
        for letter in seat_letters:
            seat_number = f"{row}{letter}"
            
            # Phân loại ghế theo hàng và tính price_modifier
            if row <= 3:
                seat_class = "Business"
                price_modifier = 500000.0  # +500k VND cho Business
            elif row <= 8:
                seat_class = "Premium"
                price_modifier = 200000.0  # +200k VND cho Premium
            else:
                seat_class = "Economy"
                price_modifier = 0.0       # Giá gốc cho Economy
            
            # Ghế cửa sổ (A, F) thêm phụ phí
            if letter in ['A', 'F']:
                price_modifier += 50000.0  # +50k VND cho cửa sổ
            
            session.execute(text("""
                INSERT INTO seats (
                    flight_id, seat_number, seat_class, status,
                    price_modifier, created_at
                ) VALUES (
                    :flight_id, :seat_number, :seat_class, :status,
                    :price_modifier, :created_at
                )
            """), {
                'flight_id': flight_id,
                'seat_number': seat_number,
                'seat_class': seat_class,
                'status': 'available',
                'price_modifier': price_modifier,
                'created_at': datetime.now()
            })
            
            seats_created += 1
    
    return seats_created

if __name__ == "__main__":
    try:
        create_all_seats()
        
        # Test với một vài flights
        print(f"\n🧪 TEST RESULTS:")
        print("=" * 30)
        
        with session_scope() as session:
            test_flights = session.execute(text("""
                SELECT f.id, f.flight_number, COUNT(s.id) as seat_count
                FROM flights f
                LEFT JOIN seats s ON f.id = s.flight_id
                WHERE f.id IN (1, 2, 3, 100, 500, 805)
                GROUP BY f.id, f.flight_number
                ORDER BY f.id
            """)).fetchall()
            
            for flight in test_flights:
                status = "✅" if flight.seat_count == 180 else "❌"
                print(f"   {status} Flight {flight.id} ({flight.flight_number}): {flight.seat_count} seats")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()