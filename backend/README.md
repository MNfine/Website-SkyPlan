# SkyPlan Backend (Flask + SQLAlchemy)

Backend của SkyPlan xây dựng bằng Flask và SQLAlchemy. Cung cấp:

- **REST API** cho flights, bookings, auth, payments (VNPay demo)
- **Phục vụ HTML/assets** của frontend trong quá trình phát triển (server tích hợp)
- **Model database** và script import dữ liệu demo

## Tổng quan
- **Ngôn ngữ**: Python 3.10+
- **Framework**: Flask với CORS support
- **Database**: PostgreSQL 13+ (production) hoặc SQLite (chạy nhanh local)
- **ORM**: SQLAlchemy 2.0+
- **Payment**: VNPay integration (demo)
- **Dependencies**: psycopg2-binary cho tester/CI

## Yêu cầu
- Python 3.10+
- PostgreSQL 13+ (DB thật) hoặc SQLite (chạy nhanh local)
- Pipenv/venv khuyến nghị

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
    booking.py          # Model Booking, BookingPassenger
    payments.py         # Model Payment
    user.py             # Model User
    seats.py            # Model Seat
    tickets.py          # Model Ticket
  routes/
    flights.py          # /api/flights, /api/flights/roundtrip
    bookings.py         # Booking endpoints
    payments.py         # VNPay endpoints (demo)
    auth.py             # Auth endpoints
    seats.py            # Seat management
    tickets.py          # Ticket management
  db/
    create_tables.py    # Tạo bảng (nếu cần)
    import_flights.py   # Import flights demo từ CSV
    create_all_seats.py # Tạo ghế cho flights
    demo_flights_vn_airport_names.csv # Dataset demo
```

## Cài đặt dependencies

### Windows PowerShell
```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

**Lưu ý**: dự án dùng `psycopg2-binary` cho tester/CI để khớp DSN `postgresql+psycopg2`. Khi production có thể cân nhắc `psycopg2` (build từ source) hoặc `psycopg` (v3) và đổi DSN.

## Cấu hình (.env)

Tạo file `.env` ở thư mục gốc (ngang hàng với `backend/`) với nội dung cơ bản:

```env
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

**Ghi chú**:
- `backend/models/db.py` fallback sang SQLite nếu thiếu `DATABASE_URL`. Tuy nhiên `backend/app.py` hiện yêu cầu biến này, nếu thiếu sẽ báo lỗi.
- Để chạy nhanh với SQLite, hãy đặt `DATABASE_URL=sqlite:///skylan.db` trong `.env` hoặc chỉnh `app.py` để không raise.

## Database

### Tạo database trong PostgreSQL (nếu chưa có):
```sql
CREATE DATABASE skyplan;
```

### Tạo bảng bằng init_db khi khởi động app hoặc chạy script:
```powershell
# Cách A: chạy app (init_db sẽ tự tạo bảng)
python backend/app.py

# Cách B: chạy script tạo bảng (nếu có)  
python backend/db/create_tables.py
```

### Import flights demo (khuyến nghị để có dữ liệu hiển thị UI):
```powershell
# Mặc định: xoá dữ liệu cũ và import từ CSV
python backend/db/import_flights.py

# Giữ dữ liệu cũ, chỉ thêm mới
python backend/db/import_flights.py --keep-existing

# Tạo ghế cho các chuyến bay
python backend/db/create_all_seats.py
```

## Chạy server

Khởi động server tích hợp (phục vụ frontend + API):

```powershell
python backend/app.py
```

**Ứng dụng sẽ chạy trên:**
- **Frontend**: `http://localhost:5000`
- **API base**: `http://localhost:5000/api`

## API chính

### Health & Info
- `GET /api/health` 
- `GET /api` - API index

### Flights
- `GET /api/flights?from=HAN&to=SGN&date=2025-10-10`
- `GET /api/flights/roundtrip?from=HAN&to=SGN&date=2025-10-10&return_date=2025-10-12`

### Auth
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập  
- `GET /api/auth/profile` - Lấy thông tin profile (requires token)

### Bookings
- `POST /api/bookings/create` - Tạo booking mới (hỗ trợ guest + authenticated)
- `POST /api/bookings/passenger` - Tạo/cập nhật passenger profile
- `GET /api/bookings/` - Liệt kê bookings của user
- `GET /api/bookings/<booking_code>` - Lấy chi tiết booking  
- `GET /api/bookings/status/<booking_code>` - Kiểm tra trạng thái booking
- `PATCH /api/bookings/<booking_code>/cancel` - Hủy booking

### Payments (VNPay demo)
- `POST /api/payment/vnpay/create` - Tạo VNPay payment URL
- `GET /api/payment/vnpay/return` - VNPay return handler
- `POST /api/payment/vnpay/ipn` - VNPay IPN notification

### Seats & Tickets  
- `/api/seats/*` - Quản lý ghế ngồi
- `/api/tickets/*` - Quản lý vé máy bay

**Ghi chú tìm chuyến bay**:
- Tham số `from`/`to` nhận IATA (VD: HAN, SGN) hoặc tên tỉnh/thành tiếng Việt (có/không dấu). Backend map tên → mã sân bay dựa trên CSV và alias.

## Ghi chú cho Tester/CI

- Cố định `psycopg2-binary==2.9.9` để khớp DSN `postgresql+psycopg2://` và tránh xung đột.
- Nếu chuyển sang psycopg3: cập nhật cả hai nơi:
  - `backend/requirements.txt`: thêm `psycopg[binary]` hoặc `psycopg[c]`
  - `.env`: `DATABASE_URL=postgresql+psycopg://...`

## Troubleshooting

### Common Issues
- **ImportError psycopg2**: kích hoạt venv và cài lại requirements.
- **DATABASE_URL chưa đặt**: thêm vào `.env` hoặc export trong môi trường.
- **Không thấy chuyến bay**: đảm bảo đã import CSV hoặc ngày tìm trùng với dữ liệu trong DB.

### Database Connection
```powershell
# Kiểm tra PostgreSQL đang chạy  
pg_isready -h localhost -p 5432

# Test connection string
python -c "from backend.models.db import engine; print(engine.execute('SELECT 1').scalar())"
```

## Testing

### Manual Testing
```powershell
# Test API health
curl http://localhost:5000/api/health

# Test database connection
python -c "from backend.models.db import engine; print(engine.execute('SELECT 1').scalar())"
```

### Unit Tests (if implemented)
```powershell
pytest backend/tests/
```

## Database Schema

### Core Models
- **User** - Người dùng đăng ký
- **Flight** - Thông tin chuyến bay
- **Booking** - Đơn đặt vé (hỗ trợ guest booking)
- **BookingPassenger** - Liên kết booking với hành khách
- **Passenger** - Thông tin hành khách
- **Seat** - Ghế ngồi trên máy bay
- **Payment** - Thông tin thanh toán VNPay
- **Ticket** - Vé điện tử được phát hành

### Key Features
- **Guest Booking**: Cho phép đặt vé không cần đăng ký
- **Multi-passenger**: Một booking có thể chứa nhiều hành khách
- **Round-trip Support**: Hỗ trợ vé một chiều và khứ hồi
- **Seat Selection**: Chọn ghế với pricing khác nhau
- **Payment Integration**: Tích hợp VNPay gateway

## Security Notes

### Environment Variables
- Không commit file `.env` vào git
- Sử dụng strong passwords cho database
- Rotate VNPay secrets định kỳ

### API Security
- JWT tokens cho authentication
- CORS được cấu hình cho specific origins
- Input validation ở tất cả endpoints

## Performance Considerations

### Database
- Connection pooling được cấu hình trong `db.py`
- Indexes trên các cột thường query (user_id, booking_code, etc.)
- Use `session_scope()` context manager để tránh memory leaks

### Caching
- Có thể thêm Redis cho session caching
- Static assets được serve với appropriate headers

## License
Dự án mang tính học thuật/demo. Xem license chính ở root repo nếu có.

---

**Need help?**
- Kiểm tra logs trong terminal khi chạy `python backend/app.py`  
- Review mã nguồn trong `backend/routes/` cho API details
- Tham khảo `backend/models/` cho database schema
