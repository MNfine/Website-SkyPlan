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
  # SkyPlan Backend (Flask + SQLAlchemy)

  Backend của SkyPlan được viết bằng Flask và SQLAlchemy. README này tóm tắt cách cài đặt, cấu hình, các endpoint API chính và một số lưu ý vận hành khi làm việc cùng frontend.

  Phiên bản hiện tại hỗ trợ các tính năng chính:
  - REST API cho flights, bookings, auth, payments (VNPay demo)
  - Hỗ trợ guest bookings và authenticated bookings (bao gồm trường hợp authenticated user gửi guest_passenger)
  - Claim flow: gán booking guest cho user khi cần
  - Seat selection và cập nhật trạng thái ghế
  - Scripts import dữ liệu demo và tạo ghế

  ## Công nghệ & yêu cầu
  - Python 3.10+
  - Flask
  - SQLAlchemy (ORM)
  - PostgreSQL (khuyến nghị) hoặc SQLite (fallback cho local/dev)

  ## Cấu trúc thư mục (chung)
  ```
  backend/
    app.py                # App factory + wiring routes
    config.py             # Cấu hình (VNPay, email, env)
    requirements.txt      # Dependencies
    models/               # SQLAlchemy models (Booking, Passenger, Flight, Payment, Seat, ...)
    routes/               # Flask blueprints (bookings, payments, auth, flights, seats, tickets, ...)
    db/                   # DB helper scripts (create tables, import demo data, create seats)
  ```

  ## Cài đặt (local, PowerShell)
  ```powershell
  # Tạo ảo môi trường
  python -m venv .venv
  .\.venv\Scripts\Activate
  pip install --upgrade pip
  pip install -r backend/requirements.txt
  ```

  ## Cấu hình (.env)
  Tạo file `.env` ở root repo hoặc thiết lập biến môi trường phù hợp.

  Ví dụ tối thiểu:
  ```env
  SECRET_KEY=your-secret
  DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/skyplan
  # VNPay (nếu dùng)
  VNPAY_TMN_CODE=...
  VNPAY_HASH_SECRET=...
  VNPAY_RETURN_URL=http://localhost:5000/api/payment/vnpay/return
  ```

  Ghi chú:
  - `backend/models/db.py` có fallback sang SQLite nếu `DATABASE_URL` không được đặt. Để nhanh, bạn có thể dùng `sqlite:///skyplan.db`.
  - Không commit `.env` lên git.

  ## Tạo & import dữ liệu
  - Tạo bảng: khi chạy `backend/app.py` trong nhiều cấu hình sẽ tự tạo bảng nếu cần.
  - Import flight demo (CSV):
    - `python backend/db/import_flights.py`
    - `python backend/db/create_all_seats.py` để sinh ghế cho các chuyến bay

  ## Chạy server (dev)
  ```powershell
  python backend/app.py
  ```

  Mặc định server sẽ lắng nghe trên `http://localhost:5000` và API base là `http://localhost:5000/api`.

  ## API chính (tóm tắt)

  Authentication
  - `POST /api/auth/register` - Đăng ký
  - `POST /api/auth/login` - Đăng nhập (trả token)
  - `GET /api/auth/profile` - Thông tin user (Bearer token)

  Flights
  - `GET /api/flights` - Tìm chuyến
  - `GET /api/flights/roundtrip` - Tìm khứ hồi

  Bookings
  - `POST /api/bookings/create` - Tạo booking
    - Hỗ trợ cả hai dạng payload:
      - `passengers`: danh sách passenger IDs (được lưu trước) hoặc
      - `guest_passenger`: object hành khách (backend sẽ tạo Passenger và gán user nếu user đã đăng nhập)
    - `total_amount` được kiểm toán (server recompute) trước khi commit.
  - `POST /api/bookings/passenger` - Tạo/update passenger profile cho user
  - `GET /api/bookings/` - Liệt kê bookings của user (Bearer token required)
  - `GET /api/bookings/<booking_code>` - Lấy chi tiết booking (user must own booking)
  - `GET /api/bookings/status/<booking_code>` - Lấy trạng thái booking (hỗ trợ guest lookup khi booking.user_id is None)
  - `POST /api/bookings/<booking_code>/claim` - Gán booking guest cho user (claim)
  - `PATCH /api/bookings/<booking_code>/cancel` - Hủy booking

  Payments (VNPay demo)
  - `POST /api/payment/vnpay/create` - Tạo URL thanh toán VNPay
  - `GET /api/payment/vnpay/return` - VNPay return callback
  - `POST /api/payment/vnpay/ipn` - VNPay server-to-server notification (IPN)
  - `POST /api/payments/confirm` - Xác nhận payment (internal flow)

  Seats & Tickets
  - `/api/seats/*` - Đặt ghế / đánh dấu ghế đã booking
  - `/api/tickets/*` - Phát hành vé và quản lý ticket

  Debug & utilities
  - `GET /api/bookings/debug/inspect` - debug endpoint (trả booking count cho token hiện tại)

  ## Behaviour & important notes
  - Create booking for authenticated users: backend chấp nhận cả `passengers` và `guest_passenger`. Nếu user đã đăng nhập nhưng frontend gửi `guest_passenger` (ví dụ user nhập thông tin hành khách mới thay vì chọn passenger được lưu), backend sẽ tạo Passenger gắn với user và tiếp tục tạo booking. Điều này tránh lỗi 400 khi payload thiếu `passengers`.
  - Server recomputes `total_amount` trước khi chấp nhận booking để tránh client tampering; sai lệch lớn sẽ bị từ chối.
  - VNPay flow: confirmation page cố gắng verify txnRef bằng `/api/bookings/status/:code`. Nếu thành công, UI dùng dữ liệu server làm nguồn đúng.

  ## Frontend integration hints (thực tế hay gặp)
  - LocalStorage keys frontend dùng:
    - `storedPassengerId` / `activePassengerId`: id passenger để gửi `passengers: [id]` khi tạo booking
    - `currentBookingCode` / `lastBookingCode`: để hiển thị confirmation fallback khi server chưa trả dữ liệu
    - `selectedSeats`: danh sách ghế đã chọn trước khi thanh toán
  - Nếu bạn thấy confirmation page hiển thị booking code mà `/api/bookings/` không tăng, thường là vì `POST /api/bookings/create` không commit (ví dụ 400). Kiểm tra Network tab và response body để debug.

  ## Troubleshooting nhanh
  - 400 khi tạo booking: kiểm tra payload - cần `outbound_flight_id`, `trip_type`, `fare_class`, `total_amount` và (`passengers` hoặc `guest_passenger`).
  - 401 khi gọi API bảo mật: đảm bảo `Authorization: Bearer <token>` header đúng.
  - Không thấy flights: chắc bạn chưa import CSV hoặc query date mismatch.

  ## Testing
  - Manual: dùng curl/Postman hoặc frontend flows.
  - Unit/integration: thêm pytest trong `backend/tests/` (chưa có sẵn trong repo mặc định). Một test quan trọng cần có: tạo booking (auth & guest), mark payment, kiểm tra trạng thái và rằng booking được gán cho user khi phù hợp.

  ## Deployment notes
  - Trong production, dùng PostgreSQL và cấu hình `DATABASE_URL` tương ứng.
  - Quản lý secrets (VNPay, mail) bằng secret manager; không commit `.env`.

  ## Contributing
  - Xem `backend/routes/` để biết chi tiết endpoint.
  - Khi thay đổi model, cập nhật/migrate DB tương ứng (hiện repo không kèm Alembic; nếu cần hãy thêm hoặc dùng script `db/create_tables.py`).

  ---
