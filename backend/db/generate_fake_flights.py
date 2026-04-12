import csv
from datetime import datetime, timedelta
import random

# Danh sách sân bay phổ biến ở Việt Nam
AIRPORTS = [
    ('HAN', 'Sân bay quốc tế Nội Bài', 'Hà Nội'),
    ('SGN', 'Sân bay quốc tế Tân Sơn Nhất', 'TP.HCM'),
    ('DAD', 'Sân bay quốc tế Đà Nẵng', 'Đà Nẵng'),
    ('CXR', 'Sân bay quốc tế Cam Ranh', 'Khánh Hòa'),
    ('HPH', 'Sân bay quốc tế Cát Bi', 'Hải Phòng'),
    ('VCA', 'Sân bay quốc tế Cần Thơ', 'Cần Thơ'),
    ('VII', 'Sân bay Vinh', 'Nghệ An'),
    ('DLI', 'Sân bay quốc tế Liên Khương', 'Lâm Đồng'),
    ('HUI', 'Sân bay quốc tế Phú Bài', 'Huế'),
    ('BMV', 'Sân bay Buôn Ma Thuột', 'Đắk Lắk'),
]

AIRLINES = ['Vietnam Airlines', 'Vietjet Air', 'Bamboo Airways']
CURRENCY = 'VND'

# Những route phổ biến để dữ liệu dày đặc
POPULAR_ROUTES = [
    ('HAN', 'SGN'),  # Hà Nội - TP.HCM
    ('SGN', 'HAN'),  # TP.HCM - Hà Nội
    ('HAN', 'DAD'),  # Hà Nội - Đà Nẵng
    ('DAD', 'HAN'),  # Đà Nẵng - Hà Nội
    ('SGN', 'DAD'),  # TP.HCM - Đà Nẵng
    ('DAD', 'SGN'),  # Đà Nẵng - TP.HCM
    ('HAN', 'HPH'),  # Hà Nội - Hải Phòng
    ('SGN', 'CXR'),  # TP.HCM - Cam Ranh
]

# Sinh dữ liệu chuyến bay giả lập từ hôm nay
rows = []
start_date = datetime(2026, 4, 7)  # Hôm nay: 7/4/2026
end_date = datetime(2026, 6, 6)    # 60 ngày sau

# Tạo 1200 chuyến bay
for i in range(1200):
    # 70% chọn route phổ biến, 30% chọn random
    if random.random() < 0.7:
        route = random.choice(POPULAR_ROUTES)
        from_code, to_code = route
        from_airport = next((a for a in AIRPORTS if a[0] == from_code), None)
        to_airport = next((a for a in AIRPORTS if a[0] == to_code), None)
        if not from_airport or not to_airport:
            continue
    else:
        from_airport = random.choice(AIRPORTS)
        to_airport = random.choice([a for a in AIRPORTS if a != from_airport])
    
    airline = random.choice(AIRLINES)
    
    # Random date từ hôm nay đến 60 ngày sau
    days_diff = (end_date - start_date).days
    date = start_date + timedelta(days=random.randint(0, days_diff))
    
    # Random giờ khởi hành
    dep_hour = random.randint(5, 20)
    dep_min = random.choice([0, 15, 30, 45])
    
    # Giờ hạ cánh (1-3 giờ sau)
    arr_hour = dep_hour + random.randint(1, 3)
    arr_min = (dep_min + random.choice([0, 10, 20, 30])) % 60
    
    # Xử lý trường hợp hạ cánh qua nửa đêm
    if arr_hour > 23:
        arr_hour = arr_hour % 24
        date = date + timedelta(days=1)
    
    depart_time_local = f"{dep_hour:02d}:{dep_min:02d}"
    arrive_time_local = f"{arr_hour:02d}:{arr_min:02d}"
    price = random.randint(900000, 3500000)
    flight_number = f"{random.choice(['VN', 'VJ', 'QH'])}{random.randint(1000, 9999)}"
    
    row = [
        flight_number,
        airline,
        from_airport[0],
        from_airport[1],
        from_airport[2],
        to_airport[0],
        to_airport[1],
        to_airport[2],
        date.strftime('%Y-%m-%d'),
        depart_time_local,
        arrive_time_local,
        price,
        CURRENCY
    ]
    rows.append(row)

header = [
    'flight_number','airline','from','from_name','from_province','to','to_name','to_province',
    'date','depart_time_local','arrive_time_local','price','currency'
]

with open('backend/db/demo_flights_fake_1200.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(rows)

print(f'✅ Đã tạo file backend/db/demo_flights_fake_1200.csv với {len(rows)} chuyến bay.')
print(f'📅 Ngày: 7/4/2026 → 6/6/2026 (60 ngày)')
print(f'🛫 Routes: 8 tuyến chính + random')
