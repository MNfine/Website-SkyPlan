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

# Sinh dữ liệu chuyến bay giả lập
rows = []
start_date = datetime(2025, 10, 8)
for i in range(300):
    from_airport = random.choice(AIRPORTS)
    to_airport = random.choice([a for a in AIRPORTS if a != from_airport])
    airline = random.choice(AIRLINES)
    date = start_date + timedelta(days=random.randint(0, 29))
    dep_hour = random.randint(5, 21)
    dep_min = random.choice([0, 15, 30, 45])
    arr_hour = dep_hour + random.randint(1, 3)
    arr_min = (dep_min + random.choice([0, 10, 20, 30])) % 60
    depart_time_local = f"{dep_hour:02d}:{dep_min:02d}"
    arrive_time_local = f"{arr_hour:02d}:{arr_min:02d}"
    price = random.randint(900000, 3500000)
    flight_number = f"{random.choice(['VN', 'VJ', 'QH'])}{random.randint(100,999)}"
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

with open('backend/db/demo_flights_fake_300.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(rows)

print('Đã tạo file backend/db/demo_flights_fake_300.csv với 300 chuyến bay giả lập.')
