# 📘 SkyPlan Backend - Hướng Dẫn API Đầy Đủ (Tiếng Việt)

Backend của SkyPlan được xây dựng bằng Flask + SQLAlchemy. Cung cấp REST API cho chuyến bay, đặt chỗ, xác thực, thanh toán (VNPay + Blockchain), vé máy bay, và phần thưởng SKY token.

**Trạng thái**: ✅ Sản xuất sẵn sàng với xác thực ví, thanh toán blockchain, và xử lý lỗi nâng cao.

---

## 📋 Mục Lục

1. [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
2. [Cài Đặt & Thiết Lập](#cài-đặt--thiết-lập)
3. [Cấu Hình Môi Trường](#cấu-hình-môi-trường)
4. [Xác Thực API](#xác-thực-api)
5. [Tham Chiếu API Đầy Đủ](#tham-chiếu-api-đầy-đủ)
6. [Luồng Thanh Toán](#luồng-thanh-toán)
7. [Xử Lý Lỗi & Phân Loại](#xử-lý-lỗi--phân-loại)
8. [Thiết Lập Cơ Sở Dữ Liệu](#thiết-lập-cơ-sở-dữ-liệu)
9. [Chạy Server](#chạy-server)

---

## Công Nghệ Sử Dụng

- **Ngôn ngữ**: Python 3.10+
- **Framework**: Flask 2.0+
- **ORM**: SQLAlchemy 2.0+
- **Cơ sở dữ liệu**: PostgreSQL 13+ (sản xuất) hoặc SQLite (phát triển)
- **Blockchain**: Web3.py, Sepolia testnet (Solidity 0.8.24)
- **Thanh toán**: VNPay + Smart contract
- **Xác thực**: JWT Bearer tokens + Chữ ký ví

---

## Cài Đặt & Thiết Lập

### Yêu Cầu Tiên Quyết

- Python 3.10+
- PostgreSQL 13+ hoặc SQLite
- Công cụ ảo môi trường (venv, virtualenv, hoặc pipenv)

### Thiết Lập Phát Triển Cục Bộ (PowerShell)

```powershell
# Tạo ảo môi trường
python -m venv .venv
.\.venv\Scripts\Activate

# Nâng cấp pip và cài đặt phụ thuộc
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

# Tạo cơ sở dữ liệu (nếu dùng PostgreSQL, đảm bảo server đang chạy)
# Các bảng sẽ tự tạo trong lần chạy đầu tiên
```

### Nhập Dữ Liệu Demo

```powershell
# Nhập các chuyến bay mẫu
python backend/db/import_flights.py

# Tạo ghế cho tất cả các chuyến bay
python backend/db/create_all_seats.py
```

---

## Cấu Hình Môi Trường

Tạo file `.env` ở thư mục gốc của dự án với các biến sau:

### Cấu Hình Tối Thiểu

```env
# Flask
SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# Cơ sở dữ liệu (chọn một)
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/skyplan
# HOẶC SQLite:
# DATABASE_URL=sqlite:///skyplan.db

# VNPay Cổng Thanh Toán (Lấy từ https://merchant.vnpayment.vn)
VNPAY_TMN_CODE=YOUR_MERCHANT_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET_KEY
VNPAY_ENV=sandbox
VNPAY_RETURN_URL=http://localhost:5000/api/payment/vnpay/return

⚠️ **CẢNH BÁO BẢO MẬT**: 
- `VNPAY_HASH_SECRET` là khóa bí mật - KHÔNG bao giờ commit hoặc chia sẻ công khai
- Lấy từ dashboard VNPay của bạn
- Nếu bị lộ, thay đổi ngay lập tức trên VNPay
```

### Cấu Hình Blockchain (Cần Thiết Cho Thanh Toán Tiền Điện Tử)

```env
# Sepolia RPC (lấy từ Alchemy, Infura, hoặc tương tự)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Khóa Riêng Tư Ví (để ký giao dịch)
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix

# Địa chỉ Hợp Đồng Thông Minh (triển khai trên Sepolia)
BOOKING_REGISTRY_ADDRESS=0x05D9367Dd84bB47562767e17FdADA2EEB15fB161
PAYMENT_REGISTRY_ADDRESS=0xC9C1CC1567C38Bcd9bCeA0797DE3B24B4824FA01
SKY_TOKEN_ADDRESS=0x909814175F83452C78e2a7dC30ee9DE6bFBE1705
TICKET_NFT_ADDRESS=0xfe68A216Bf66c46D085985e06ebDbAf5dc64FB2d

# Địa chỉ ví quản trị (nhận thanh toán)
RECEIVER_ADDRESS=0xYourWalletAddressHere
SKY_REWARD_AMOUNT=100

# Tùy chọn: Khóa API Etherscan để xác minh blockchain
ETHERSCAN_API_KEY=your_key_here
```

### Cấu Hình Email (Tùy Chọn)

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER="SkyPlan <noreply@skyplan.com>"
```

### Google Gemini API (Tùy Chọn - cho AI chat)

```env
GEMINI_API_KEY=your_gemini_api_key
```

**⚠️ QUAN TRỌNG**: Không bao giờ commit file `.env` lên git. Sử dụng template `.env.example` thay thế.

---

## Xác Thực API

### Xác Thực Bearer Token

Tất cả các endpoint được bảo vệ đều yêu cầu token `Bearer` trong header `Authorization`:

```
Authorization: Bearer <jwt_token>
```

#### Ví Dụ Yêu Cầu

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:5000/api/bookings/
```

### Cách Lấy Token

1. **Đăng Ký Hoặc Đăng Nhập**:
   ```bash
   POST /api/auth/register
   {
     "email": "user@example.com",
     "password": "secure_password",
     "full_name": "Tên Người Dùng"
   }
   ```

2. **Đăng Nhập**:
   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "secure_password"
   }
   # Trả về: { "token": "eyJhbGc..." }
   ```

3. **Sử Dụng Token Trong Các Yêu Cầu Tiếp Theo**:
   ```bash
   GET /api/bookings/ \
     -H "Authorization: Bearer eyJhbGc..."
   ```

### Đặt Chỗ Cho Khách

- Khách có thể tạo đặt chỗ **mà không cần xác thực**
- Xác thực là **bắt buộc** để xem/sửa thanh toán
- Đặt chỗ của khách có thể được yêu cầu sau này

---

## Tham Chiếu API Đầy Đủ

### Endpoint Xác Thực (6 endpoint)

#### `POST /api/auth/register` - Đăng Ký

**Yêu cầu**:
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}
```

**Phản hồi (201)**:
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-05-07T10:30:00Z"
  }
}
```

---

#### `POST /api/auth/login` - Đăng Nhập

**Yêu cầu**:
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

---

#### `GET /api/auth/profile` - Lấy Hồ Sơ

**Yêu cầu**: Cần bearer token

**Phản hồi (200)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b",
    "member_tier": "Gold",
    "total_sky_earned": 250,
    "total_sky_redeemed": 50
  }
}
```

---

#### `POST /api/auth/wallet/nonce` - Tạo Nonce

**Yêu cầu**:
```json
{
  "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "nonce": "12345",
  "message": "Ký tên để xác thực",
  "data": {
    "nonce": "12345"
  }
}
```

---

#### `POST /api/auth/wallet/verify` - Xác Minh Ví

**Yêu cầu**:
```json
{
  "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b",
  "signature": "0x1234567890abcdef...",
  "nonce": "12345"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "wallet_user@skyplan.local",
    "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b"
  }
}
```

---

#### `POST /api/auth/wallet/connect` - Kết Nối Ví

**Yêu cầu**: Bearer token bắt buộc

**Request**:
```json
{
  "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b",
  "signature": "0x1234567890abcdef..."
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "message": "Ví được kết nối thành công",
  "user": {
    "id": 1,
    "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b"
  }
}
```

---

### Endpoint Chuyến Bay (2 endpoint)

#### `GET /api/flights` - Tìm Chuyến Bay Một Chiều

**Tham số Query**:
- `from_city`: Thành phố khởi hành
- `to_city`: Thành phố đến
- `departure_date`: Ngày khởi hành (YYYY-MM-DD)
- `passenger_count`: Số hành khách (tùy chọn, mặc định 1)

**Phản hồi (200)**:
```json
{
  "success": true,
  "flights": [
    {
      "id": 1,
      "flight_code": "SK001",
      "airline": "SkyPlan Air",
      "from_airport": "SGN",
      "to_airport": "HAN",
      "departure_time": "2026-05-10T08:00:00Z",
      "arrival_time": "2026-05-10T10:30:00Z",
      "price_per_passenger": 2500000,
      "available_seats": 45,
      "aircraft_type": "Boeing 737",
      "flight_duration_minutes": 150
    }
  ]
}
```

---

#### `GET /api/flights/roundtrip` - Tìm Chuyến Bay Khứ Hồi

**Tham số Query**:
- `from_city`: Thành phố khởi hành
- `to_city`: Thành phố đến
- `departure_date`: Ngày khởi hành (YYYY-MM-DD)
- `return_date`: Ngày về (YYYY-MM-DD)
- `passenger_count`: Số hành khách

---

### Endpoint Đặt Chỗ (7 endpoint)

#### `POST /api/bookings/create` - Tạo Đặt Chỗ

**Yêu cầu** (Khách được xác thực):
```json
{
  "outbound_flight_id": 1,
  "return_flight_id": 2,
  "passengers": [1, 2],
  "selected_seats": ["12A", "12B"],
  "total_amount": 5000000
}
```

**Phản hồi (201)**:
```json
{
  "success": true,
  "booking": {
    "booking_code": "SP2025001",
    "status": "PENDING",
    "total_amount": 5000000,
    "currency": "VND",
    "created_at": "2026-05-07T10:00:00Z"
  },
  "payment": {
    "payment_id": 1,
    "status": "PENDING",
    "provider": "vnpay"
  }
}
```

---

#### `GET /api/bookings/` - Liệt Kê Đặt Chỗ

**Yêu cầu**: Bearer token bắt buộc

**Phản hồi (200)**:
```json
{
  "success": true,
  "bookings": [
    {
      "booking_code": "SP2025001",
      "status": "CONFIRMED",
      "total_amount": 2500000,
      "confirmed_at": "2026-05-07T12:30:00Z"
    }
  ]
}
```

---

#### `GET /api/bookings/<booking_code>` - Chi Tiết Đặt Chỗ

**Phản hồi (200)**:
```json
{
  "success": true,
  "booking": {
    "booking_code": "SP2025001",
    "status": "CONFIRMED",
    "total_amount": 2500000,
    "passengers": [],
    "payment": {}
  }
}
```

---

#### `GET /api/bookings/status/<booking_code>` - Trạng Thái Đặt Chỗ

**Phản hồi (200)**:
```json
{
  "success": true,
  "booking_code": "SP2025001",
  "status": "CONFIRMED",
  "total_amount": 2500000,
  "paid": true,
  "tickets_generated": 2
}
```

---

#### `POST /api/bookings/<booking_code>/claim` - Nhận Quyền Sở Hữu

**Yêu cầu**: Bearer token bắt buộc

**Phản hồi (200)**:
```json
{
  "success": true,
  "message": "Nhận quyền sở hữu đặt chỗ thành công",
  "booking": {}
}
```

---

#### `PATCH /api/bookings/<booking_code>/cancel` - Hủy Đặt Chỗ

**Yêu cầu**: Bearer token bắt buộc

**Phản hồi (200)**:
```json
{
  "success": true,
  "message": "Hủy đặt chỗ thành công",
  "booking": {
    "booking_code": "SP2025001",
    "status": "CANCELLED"
  }
}
```

---

### Endpoint Thanh Toán (7 endpoint)

#### VNPay Thanh Toán

##### `POST /api/payment/vnpay/create` - Tạo URL Thanh Toán VNPay

**Yêu cầu**:
```json
{
  "booking_code": "SP2025001",
  "amount": 2500000,
  "return_url": "http://localhost:3000/confirmation"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "transaction_ref": "SP2025001_1620000000",
  "amount": 2500000
}
```

---

##### `GET /api/payment/vnpay/return` - Callback VNPay

Tự động chuyển hướng đến `/confirmation.html?txn_ref=...&transaction_no=...`

---

#### Blockchain Thanh Toán (MetaMask)

##### `POST /api/payment/blockchain/save-hash` - Lưu Hash Giao Dịch

**Yêu cầu**: Bearer token bắt buộc

```json
{
  "bookingId": "SP2025001",
  "txHash": "0x1234567890abcdef...",
  "fromAddress": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "status": "processing"
}
```

---

##### `POST /api/payment/blockchain/confirm` - Xác Nhận Thanh Toán

**Yêu cầu**: Bearer token bắt buộc

```json
{
  "txHash": "0x1234567890abcdef...",
  "status": "success"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "status": "success"
}
```

---

##### `POST /api/payment/mark-paid` - Đánh Dấu Đã Thanh Toán

**Yêu cầu**: Bearer token bắt buộc

```json
{
  "booking_code": "SP2025001",
  "amount": 2500000,
  "transaction_id": "TXN123456",
  "provider": "manual",
  "wallet_address": "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b"
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "booking_code": "SP2025001",
  "blockchain": {
    "message": "Phần thưởng được phát hành thành công",
    "tickets_minted": 1,
    "sky_minted": 100
  }
}
```

---

### Endpoint Ghế & Vé (3 endpoint)

#### `GET /api/seats/<flight_id>` - Danh Sách Ghế Trống

**Phản hồi (200)**:
```json
{
  "success": true,
  "flight_id": 1,
  "seats": [
    {
      "seat_id": 1,
      "seat_number": "12A",
      "status": "AVAILABLE",
      "price_adjustment": 0
    }
  ],
  "total_available": 45
}
```

---

#### `POST /api/seats/<flight_id>/select` - Chọn Ghế

**Yêu cầu**: Bearer token bắt buộc

```json
{
  "seat_numbers": ["12A", "12B"],
  "passenger_ids": [1, 2]
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "reserved_seats": ["12A", "12B"]
}
```

---

#### `GET /api/tickets/<booking_code>` - Danh Sách Vé

**Phản hồi (200)**:
```json
{
  "success": true,
  "tickets": [
    {
      "ticket_id": 1,
      "ticket_number": "SK001-001",
      "passenger_name": "John Doe",
      "seat_number": "12A",
      "status": "ISSUED",
      "nft_token_id": 101,
      "issued_at": "2026-05-07T12:00:00Z"
    }
  ]
}
```

---

### Endpoint SKY Token (3 endpoint)

#### `GET /api/sky-tokens/balance` - Số Dư SKY

**Yêu cầu**: Bearer token bắt buộc

**Phản hồi (200)**:
```json
{
  "success": true,
  "balance": {
    "earned": 350,
    "redeemed": 50,
    "available": 300
  },
  "member_tier": "Gold"
}
```

---

#### `GET /api/sky-tokens/redemptions` - Lịch Sử Quy Đổi

**Yêu cầu**: Bearer token bắt buộc

**Phản hồi (200)**:
```json
{
  "success": true,
  "redemptions": [
    {
      "redemption_id": 1,
      "booking_code": "SP2025001",
      "sky_amount": 50,
      "status": "COMPLETED",
      "redeemed_at": "2026-05-07T14:00:00Z",
      "discount_amount": 500000
    }
  ]
}
```

---

#### `POST /api/sky-tokens/redeem` - Quy Đổi SKY Token

**Yêu cầu**: Bearer token bắt buộc

```json
{
  "booking_code": "SP2025001",
  "sky_amount": 50
}
```

**Phản hồi (200)**:
```json
{
  "success": true,
  "message": "SKY token quy đổi thành công",
  "discount_amount": 500000,
  "new_total": 2000000
}
```

---

## Luồng Thanh Toán

### Luồng VNPay

```
1. Frontend tạo đặt chỗ → POST /api/bookings/create
                      ↓
2. Backend trả payment_id + booking_code
                      ↓
3. Frontend yêu cầu URL thanh toán → POST /api/payment/vnpay/create
                      ↓
4. Backend trả URL VNPay
                      ↓
5. Người dùng chuyển hướng đến cổng VNPay
                      ↓
6. Người dùng hoàn thành thanh toán
                      ↓
7. VNPay chuyển hướng lại → GET /api/payment/vnpay/return
                      ↓
8. Backend xác minh chữ ký, xác nhận thanh toán
                      ↓
9. Backend phát hành vé + SKY token
                      ↓
10. Frontend chuyển hướng đến /confirmation.html
```

---

### Luồng Blockchain (MetaMask)

```
1. Frontend tạo đặt chỗ → POST /api/bookings/create
                      ↓
2. Backend trả booking_code + payment_id
                      ↓
3. Frontend yêu cầu thanh toán MetaMask (PaymentRegistry.recordPayment)
                      ↓
4. Người dùng phê duyệt giao dịch trong MetaMask
                      ↓
5. Thanh toán được ghi trên blockchain + tự động xác nhận
                      ↓
6. Frontend gửi tx hash → POST /api/payment/blockchain/save-hash
                      ↓
7. Frontend xác nhận thanh toán → POST /api/payment/blockchain/confirm
                      ↓
8. Backend xác minh thanh toán trên blockchain
                      ↓
9. Backend phát hành vé + SKY token
                      ↓
10. Frontend hiển thị thông báo thành công
```

---

## Xử Lý Lỗi & Phân Loại

Backend cung cấp phân loại lỗi chi tiết để giúp client xử lý lỗi phù hợp.

### Các Loại Lỗi

| Loại Lỗi | Có Thể Thử Lại | Nguyên Nhân | Hành Động Đề Xuất |
|----------|---|---|---|
| `access_control` | ❌ Không | Tài khoản thiếu quyền | Liên hệ quản trị viên |
| `insufficient_gas` | ✅ Có | Hết gas | Thử lại với gas cao hơn |
| `network_error` | ✅ Có | RPC timeout | Thử lại sau vài giây |
| `contract_revert` | ❌ Không | Logic hợp đồng từ chối | Kiểm tra trạng thái đặt chỗ |
| `invalid_input` | ❌ Không | Tham số sai | Xác minh tất cả đầu vào |
| `unknown` | ❌ Không | Lỗi khác | Liên hệ hỗ trợ |

### Ví Dụ Phản Hồi Lỗi

**Yêu cầu**:
```bash
POST /api/payment/blockchain/confirm
Authorization: Bearer eyJhbGc...
```

**Phản hồi Lỗi (402 - Lỗi Mạng Có Thể Thử Lại)**:
```json
{
  "success": false,
  "message": "Timeout mạng - Giao dịch vẫn có thể đang xử lý",
  "suggestion": "Thử lại sau vài giây",
  "error_type": "network_error",
  "retryable": true
}
```

**Phản hồi Lỗi (403 - Lỗi Quyền Hạn Không Thể Thử Lại)**:
```json
{
  "success": false,
  "message": "Từ chối quyền - Tài khoản thiếu vai trò yêu cầu",
  "suggestion": "Liên hệ quản trị viên để được cấp quyền",
  "error_type": "access_control",
  "retryable": false
}
```

---

## Thiết Lập Cơ Sở Dữ Liệu

### Tạo Bảng

```powershell
python backend/db/create_tables.py
```

### Nhập Dữ Liệu Demo

```powershell
# Nhập 1200 chuyến bay mẫu
python backend/db/generate_fake_flights.py
python backend/db/import_flights.py

# Tạo ghế (1-30 mỗi máy bay)
python backend/db/create_all_seats.py
```

### Bảng Cơ Sở Dữ Liệu Chính

- `users` - Tài khoản người dùng + địa chỉ ví
- `bookings` - Đặt chỗ chuyến bay
- `passengers` - Thông tin hành khách
- `flights` - Thông tin chuyến bay
- `seats` - Trạng thái ghế
- `payments` - Bản ghi thanh toán
- `tickets` - Vé được phát hành
- `sky_tokens` - Giao dịch SKY token
- `sky_vouchers` - Mã giảm giá SKY

---

## Chạy Server

### Server Phát Triển

```powershell
# Kích hoạt ảo môi trường (nếu chưa kích hoạt)
.\.venv\Scripts\Activate

# Chạy server
python backend/app.py
```

**URL Mặc Định**: `http://localhost:5000`
**API Base**: `http://localhost:5000/api`

### Triển Khai Sản Xuất

```powershell
# Sử dụng Gunicorn
gunicorn -c backend/gunicorn_config.py backend.app:app
```

### Biến Môi Trường Sản Xuất

```env
FLASK_ENV=production
SECRET_KEY=your-secure-random-key
DATABASE_URL=postgresql+psycopg2://user:pass@prod-db-host:5432/skyplan
VNPAY_ENV=production
VNPAY_RETURN_URL=https://skyplan.com/confirmation
```

---

## Các Vấn Đề Thường Gặp & Khắc Phục

### Lỗi Kết Nối Cơ Sở Dữ Liệu

**Lỗi**: `sqlalchemy.exc.OperationalError: could not connect to server`

**Giải pháp**:
- Đảm bảo PostgreSQL đang chạy
- Kiểm tra DATABASE_URL trong .env
- Sử dụng SQLite cho phát triển: `DATABASE_URL=sqlite:///skyplan.db`

---

### Lỗi Xác Minh Chữ Ký VNPay

**Lỗi**: `Invalid signature`

**Giải pháp**:
- Xác minh VNPAY_HASH_SECRET chính xác
- Kiểm tra VNPAY_ENV được đặt đúng cách
- Lấy thông tin từ dashboard VNPay của bạn

---

### Timeout Giao Dịch Blockchain

**Lỗi**: `Network timeout - Transaction may still be processing`

**Giải pháp**:
- Xác minh URL Sepolia RPC có thể truy cập
- Kiểm tra giao dịch trên Etherscan: `https://sepolia.etherscan.io/tx/<txHash>`
- Thử lại sau vài giây (tự động thử lại với backoff lũy thừa)

---

## Tài Nguyên Bổ Sung

- **Hợp Đồng Blockchain**: Xem `skyplan-blockchain/README.md`
- **Frontend**: Xem `frontend/README.md`
- **Triển Khai**: Xem `docs/render-setup.md`

---

**Cập Nhật Cuối**: May 7, 2026  
**Trạng Thái**: Sản Xuất Sẵn Sàng  
**Người Duy Trì**: SkyPlan Team
