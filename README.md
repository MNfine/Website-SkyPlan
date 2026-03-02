
 # SkyPlan — Ứng dụng đặt vé máy bay

 Đây là repository chứa toàn bộ ứng dụng SkyPlan: frontend tĩnh bằng HTML/CSS/JavaScript (vanilla) và backend bằng Python + Flask sử dụng SQLAlchemy. README này hướng dẫn cài đặt, chạy local, cấu hình và các lưu ý phát triển cho cả frontend và backend.

## Nội dung chính

- `frontend/` — Mã nguồn giao diện tĩnh (HTML, CSS, JS)
- `backend/` — Ứng dụng Flask + API
- `docs/architecture.md` — Tài liệu kiến trúc chi tiết (luồng booking, thiết kế DB, vận hành)

## Chạy nhanh (Windows PowerShell)

Yêu cầu:
- Python 3.10+
- Git
- (Tùy chọn) PostgreSQL 13+ cho môi trường gần production; SQLite có thể dùng cho chạy local nhanh.

Các bước cơ bản:

```powershell
# 1. Clone repo
git clone <repo-url> SkyPlan
cd "SkyPlan"

# 2. Tạo virtualenv và cài dependency backend
python -m venv .venv
.\.venv\Scripts\Activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Tạo file cấu hình .env (copy từ template nếu có)
copy backend\.env.example backend\.env
# Sửa backend\.env để thiết lập DATABASE_URL, SECRET_KEY, VNPAY_*...

# 4. (Tuỳ chọn) Import dữ liệu demo và tạo ghế
python backend/db/import_flights.py
python backend/db/create_all_seats.py

# 5. Chạy backend (phục vụ cả frontend trong dev)
python backend/app.py

# Mở http://localhost:5000
```

Ghi chú:
- Nếu không có PostgreSQL, bạn có thể dùng SQLite bằng cách đặt `DATABASE_URL=sqlite:///skyplan_local.db` trong `backend/.env`.
- Frontend tĩnh cũng có thể mở trực tiếp file HTML, nhưng để gọi API bạn nên chạy backend server.

## Biến môi trường quan trọng

- `SECRET_KEY` — Khóa bí mật của Flask
- `DATABASE_URL` — DSN của SQLAlchemy (vd: `postgresql+psycopg2://user:pass@localhost:5432/skyplan` hoặc `sqlite:///skyplan.db`)
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` — Cấu hình VNPay (demo)
- Cấu hình mail nếu muốn gửi email xác nhận

Không commit file `.env` chứa secrets lên Git.

## Tổng quan Backend

Thư mục `backend/` chứa ứng dụng Flask và các model SQLAlchemy. Thành phần chính:

- `backend/app.py` — Khởi tạo app, đăng ký blueprint
- `backend/config.py` — Load cấu hình
- `backend/models/` — Models: User, Flight, Booking, Passenger, Seat, Payment, Ticket...
- `backend/routes/` — Blueprints: `auth.py`, `flights.py`, `bookings.py`, `payments.py`, `seats.py`, `tickets.py`
- `backend/db/` — scripts để tạo bảng/import dữ liệu demo

Lưu ý hành vi chính:
- `POST /api/bookings/create` chấp nhận `passengers` (list id) hoặc `guest_passenger` (object). Nếu user đã đăng nhập nhưng gửi `guest_passenger`, backend sẽ tạo Passenger gán cho user rồi tiếp tục tạo booking (tránh lỗi khi frontend chưa lưu `storedPassengerId`).
- Server sẽ recompute `total_amount` trên server khi tạo booking để tránh client tamper.
- VNPay: các endpoint tạo giao dịch, return, IPN đã có để demo.

## Tổng quan Frontend

Frontend là tĩnh, nằm trong `frontend/`. Một số file/điểm quan trọng:

- Trang: `index.html`, `search.html`, `seat.html`, `confirmation.html`, `my_trips.html`, ...
- Scripts: `frontend/assets/scripts/`
	- `overview.js`, `payment_order.js`, `payment.js` — Xây payload booking và gọi API
	- `passenger.js` — Tạo/cập nhật passenger; lưu `storedPassengerId` vào `localStorage` khi có id
	- `confirmation.js` — Kiểm tra txnRef với `GET /api/bookings/status/:code`, gọi claim nếu cần
	- `my_trips.js` — Hiển thị bookings của user (GET /api/bookings/)

Một vài khóa `localStorage` thường dùng:
- `storedPassengerId` / `activePassengerId` — id passenger đã lưu
- `currentBookingCode` / `lastBookingCode` — mã booking để hiển thị fallback
- `selectedSeats` — danh sách ghế đã chọn

Nếu confirmation hiển thị code nhưng `my_trips` không tăng số booking, kiểm tra Network → `POST /api/bookings/create` có trả 201 không (nếu 400 thì booking không được commit).

## Chạy test (gợi ý)

Hiện chưa có bộ test đầy đủ. Nên bổ sung:
- Unit test cho models, utils (pytest)
- Integration smoke test: tạo booking → mark-paid → assert booking.status == CONFIRMED

Ví dụ chạy pytest (nếu có):

```powershell
pytest backend/tests/
```

## Debug & Troubleshooting

- Xem logs backend khi chạy `python backend/app.py` để biết lỗi
- Dùng DevTools Network để kiểm tra payload gửi lên `/api/bookings/create` và `/api/payments/*`
- Debug endpoint: `GET /api/bookings/debug/inspect` (gửi Bearer token) để xem số lượng booking của user

## Tài liệu kiến trúc

Tài liệu chi tiết về kiến trúc và các luồng nghiệp vụ nằm ở `docs/architecture.md` (tiếng Việt).

## Triển khai

- Production: dùng PostgreSQL, WSGI server (Gunicorn/uWSGI), reverse proxy (nginx)
- Quản lý secrets bằng biến môi trường hoặc secret manager
- Nên dùng Alembic để migrate schema khi thay đổi model

## Contributing

1. Tạo branch: `git checkout -b feature/xxx`
2. Code, test local
3. Tạo PR vào `main`

Vui lòng follow coding style và thêm test khi thay đổi logic quan trọng.
