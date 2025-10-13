# SkyPlan Backend (Flask + SQLAlchemy)

Backend của SkyPlan xây dựng bằng Flask và SQLAlchemy. Cung cấp:

- REST API cho flights, bookings, auth, payments (VNPay demo)
- Phục vụ HTML/asset của frontend trong quá trình phát triển (server tích hợp)
- Model database và script import dữ liệu demo

## Yêu cầu

- Python 3.10+
- PostgreSQL 13+ (DB thật) hoặc SQLite (chạy nhanh local)
- Pipenv/venv khuyến nghị

Cài đặt dependencies:

```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

Lưu ý: dự án dùng psycopg2-binary cho tester/CI để khớp DSN `postgresql+psycopg2`. Khi production có thể cân nhắc psycopg2 (build từ source) hoặc psycopg (v3) và đổi DSN.

## Cấu trúc dự án

```
backend/
  app.py                # Tạo app Flask và wire routes
  config.py             # Config (VNPay/Email demo)
  requirements.txt      # Dependencies
  models/
    db.py               # Engine/session; fallback SQLite nếu thiếu env var
    flights.py          # Model Flight
    passenger.py        # Model Passenger
    payments.py         # Model Payment
    user.py             # Model User
  routes/
    flights.py          # /api/flights, /api/flights/roundtrip
    bookings.py         # Booking endpoints
    payments.py         # VNPay endpoints (demo)
    auth.py             # Auth endpoints
  db/
    create_tables.py    # Tạo bảng (nếu cần)
    import_flights.py   # Import flights demo từ CSV
    demo_flights_vn_airport_names.csv # Dataset demo
```

## Cấu hình (.env)

Tạo `backend/.env` với nội dung cơ bản:

```
# Flask
SECRET_KEY=skyplan-secret-key-2025

# Database (PostgreSQL qua psycopg2)
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/skyplan

# Tuỳ chọn: VNPay (sandbox)
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_ENV=sandbox
VNPAY_RETURN_URL=http://localhost:5000/api/payment/vnpay/return

# Tuỳ chọn: Email
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=noreply@skyplan.com
```

Ghi chú:
- `backend/models/db.py` fallback sang SQLite nếu thiếu `DATABASE_URL`. Tuy nhiên `backend/app.py` hiện yêu cầu biến này, nếu thiếu sẽ báo lỗi. Để chạy nhanh với SQLite, hãy đặt `DATABASE_URL=sqlite:///skylan.db` trong `.env` hoặc chỉnh `app.py` để không raise.

## Database

Tạo database trong PostgreSQL (nếu chưa có):

```sql
CREATE DATABASE skyplan;
```

Tạo bảng bằng init_db khi khởi động app hoặc chạy script:

```powershell
# Cách A: chạy app (init_db sẽ tự tạo bảng)
python -m backend.app

# Cách B: chạy script tạo bảng (nếu có)
python backend/db/create_tables.py
```

Import flights demo (khuyến nghị để có dữ liệu hiển thị UI): python backend/db/import_flights.py

```powershell
# Mặc định: xoá dữ liệu cũ và import từ CSV
python backend/db/import_flights.py

# Giữ dữ liệu cũ, chỉ thêm mới
python backend/db/import_flights.py --keep-existing
```

## Chạy server

Khởi động server tích hợp (phục vụ frontend + API):

```powershell
python -m backend.app
```

- Frontend: http://localhost:5000
- API base: http://localhost:5000/api

## API chính

- Health: `GET /api/health`
- API index: `GET /api`
- Flights:
  - `GET /api/flights?from=HAN&to=SGN&date=2025-10-10`
  - `GET /api/flights/roundtrip?from=HAN&to=SGN&date=2025-10-10&return_date=2025-10-12`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`
- Payments (VNPay demo): `POST /api/payment/vnpay/create`, `GET /api/payment/vnpay/return`, `GET /api/payment/vnpay/ipn`

Ghi chú tìm chuyến bay:
- Tham số `from`/`to` nhận IATA (VD: HAN, SGN) hoặc tên tỉnh/thành tiếng Việt (có/không dấu). Backend map tên → mã sân bay dựa trên CSV và alias.

## Ghi chú cho Tester/CI

- Cố định `psycopg2-binary==2.9.9` để khớp DSN `postgresql+psycopg2://` và tránh xung đột.
- Nếu chuyển sang psycopg3: cập nhật cả hai nơi:
  - `backend/requirements.txt`: thêm `psycopg[binary]` hoặc `psycopg[c]`
  - `.env`: `DATABASE_URL=postgresql+psycopg://...`

## Troubleshooting

- ImportError psycopg2: kích hoạt venv và cài lại requirements.
- `DATABASE_URL` chưa đặt: thêm vào `backend/.env` hoặc export trong môi trường.
- Không thấy chuyến bay: đảm bảo đã import CSV hoặc ngày tìm trùng với dữ liệu trong DB.

## License

Dự án mang tính học thuật/demo. Xem license chính ở root repo nếu có.
