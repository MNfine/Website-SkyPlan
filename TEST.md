# ✅ Hướng Dẫn Kiểm Thử Thực Tế (API + Smart Contract)

**Ngày**: May 9, 2026  
**Mục tiêu**: Kiểm thử end‑to‑end luồng thanh toán và xác minh blockchain bằng Postman và explorer.

---

## 1) Chuẩn Bị

### 1.1 Backend đang chạy

Đảm bảo backend chạy ở `http://localhost:5000` (hoặc URL khác nếu bạn dùng ngrok).

### 1.2 Postman Environment

Tạo environment mới trong Postman, thêm các biến sau:

```
BASE_URL = http://localhost:5000
TOKEN = <Bearer token sau khi login>
BOOKING_CODE = <mã booking thực tế>
TX_HASH = <tx hash khi gửi MetaMask>
WALLET_ADDRESS = <ví người dùng>
```

**Lưu ý**: Không commit token hoặc private key.

---

## 1.3 Danh Sách API (Đầy Đủ)

### Health & Core
- `GET /api`
- `GET /api/health`

### Auth (`/api/auth`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/update`
- `POST /api/auth/wallet/nonce`
- `POST /api/auth/wallet/verify`
- `POST /api/auth/wallet/connect`

### Flights
- `GET /api/flights`
- `GET /api/flights/price-trend`

### Bookings (`/api/bookings`)
- `POST /api/bookings/passenger`
- `POST /api/bookings/create`
- `GET /api/bookings/<booking_code>`
- `POST /api/bookings/checkin/lookup`
- `GET /api/bookings/debug/inspect`
- `GET /api/bookings/`
- `PATCH /api/bookings/<booking_code>/cancel`
- `POST /api/bookings/<booking_code>/claim`
- `GET /api/bookings/status/<booking_code>`
- `GET /api/bookings/my-trips`
- `GET /api/bookings/wallets/<wallet_address>/sky-balance`
- `POST /api/bookings/redeem-sky`
- `GET /api/bookings/redeem-vouchers`
- `POST /api/bookings/blockchain/record`
- `POST /api/bookings/blockchain/integrate-nft`
- `POST /api/bookings/blockchain/onchain-hash`
- `POST /api/bookings/blockchain/verify-hash`
- `POST /api/bookings/blockchain/verify`

### Seats (`/api/seats`)
- `GET /api/seats/test`
- `POST /api/seats/debug-auth`
- `GET /api/seats/flight/<flight_id>/seats`
- `POST /api/seats/reserve`
- `POST /api/seats/release`
- `POST /api/seats/cleanup-expired`
- `POST /api/seats/book`

### Tickets (`/api/tickets`)
- `POST /api/tickets/generate`
- `GET /api/tickets/booking/<booking_id>`
- `GET /api/tickets/<ticket_code>`
- `POST /api/tickets/<ticket_code>/checkin`
- `POST /api/tickets/<ticket_code>/cancel`
- `GET /api/tickets/validate/<ticket_code>`

### Payments (`/api/payment`)
- `POST /api/payment/vnpay/create`
- `GET /api/payment/vnpay/return`
- `POST /api/payment/admin/confirm-onchain`
- `POST /api/payment/create`
- `POST /api/payment/confirm`
- `GET /api/payment/<payment_id>`
- `PATCH /api/payment/<payment_id>/status`
- `GET /api/payment/`
- `POST /api/payment/mark-paid`
- `POST /api/payment/blockchain/save-hash`
- `POST /api/payment/blockchain/confirm`

### Support (`/api/support`)
- `POST /api/support/message`
- `GET /api/support/messages`
- `POST /api/support/ticket`

### Contact (`/api/contact`)
- `POST /api/contact/submit`

### AI Chat (`/api/ai`)
- `POST /api/ai/chat`

### Metadata (`/api/metadata`)
- `GET /api/metadata/ticket/<booking_code>.json`
- `GET /api/metadata/blockchain-config`

---

## 2) Kiểm Thử API (Postman)

> Dùng Postman và environment ở mục 1.2. Tất cả API đều có format **Request/Headers/Body**.

### 2.1 Kiểm tra API Root

**Request**:
- `GET {{BASE_URL}}/api`

### 2.2 Kiểm tra Health

**Request**:
- `GET {{BASE_URL}}/api/health`

### 2.3 Đăng ký tài khoản

**Request**:
- `POST {{BASE_URL}}/api/auth/register`
- Body (JSON):
```json
{
	"email": "test+skyplan@example.com",
	"password": "Test@123456",
	"full_name": "SkyPlan Tester"
}
```

### 2.4 Đăng nhập lấy token

**Request**:
- `POST {{BASE_URL}}/api/auth/login`
- Body (JSON):
```json
{
	"email": "test+skyplan@example.com",
	"password": "Test@123456"
}
```

### 2.5 Lấy thông tin người dùng

**Request**:
- `GET {{BASE_URL}}/api/auth/profile`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.6 Cập nhật thông tin người dùng

**Request**:
- `PUT {{BASE_URL}}/api/auth/update`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"full_name": "SkyPlan Tester Updated"
}
```

### 2.7 Lấy nonce cho ví

**Request**:
- `POST {{BASE_URL}}/api/auth/wallet/nonce`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"wallet_address": "{{WALLET_ADDRESS}}"
}
```

### 2.8 Xác thực chữ ký ví

**Request**:
- `POST {{BASE_URL}}/api/auth/wallet/verify`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"wallet_address": "{{WALLET_ADDRESS}}",
	"signature": "<signed_message>"
}
```

### 2.9 Kết nối ví

**Request**:
- `POST {{BASE_URL}}/api/auth/wallet/connect`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"wallet_address": "{{WALLET_ADDRESS}}"
}
```

### 2.10 Lấy danh sách chuyến bay

**Request**:
- `GET {{BASE_URL}}/api/flights`

### 2.11 Lấy xu hướng giá chuyến bay

**Request**:
- `GET {{BASE_URL}}/api/flights/price-trend`

### 2.12 Thêm thông tin hành khách

**Request**:
- `POST {{BASE_URL}}/api/bookings/passenger`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"full_name": "Nguyen Van A",
	"gender": "M",
	"dob": "1990-01-01"
}
```

### 2.13 Tạo booking

**Request**:
- `POST {{BASE_URL}}/api/bookings/create`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"outbound_flight_id": 1,
	"passengers": [
		{"full_name": "Nguyen Van A", "gender": "M", "dob": "1990-01-01"}
	]
}
```

### 2.14 Lấy chi tiết booking

**Request**:
- `GET {{BASE_URL}}/api/bookings/{{BOOKING_CODE}}`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.15 Tra cứu checkin booking

**Request**:
- `POST {{BASE_URL}}/api/bookings/checkin/lookup`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.16 Debug: Kiểm tra booking

**Request**:
- `GET {{BASE_URL}}/api/bookings/debug/inspect`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.17 Lấy danh sách booking

**Request**:
- `GET {{BASE_URL}}/api/bookings/`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.18 Hủy booking

**Request**:
- `PATCH {{BASE_URL}}/api/bookings/{{BOOKING_CODE}}/cancel`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.19 Claim booking

**Request**:
- `POST {{BASE_URL}}/api/bookings/{{BOOKING_CODE}}/claim`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.20 Lấy trạng thái booking

**Request**:
- `GET {{BASE_URL}}/api/bookings/status/{{BOOKING_CODE}}`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.21 Lấy danh sách chuyến đi của tôi

**Request**:
- `GET {{BASE_URL}}/api/bookings/my-trips`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.22 Lấy số dư Sky

**Request**:
- `GET {{BASE_URL}}/api/bookings/wallets/{{WALLET_ADDRESS}}/sky-balance`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.23 Đổi điểm Sky

**Request**:
- `POST {{BASE_URL}}/api/bookings/redeem-sky`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"amount": 10
}
```

### 2.24 Lấy danh sách voucher đổi điểm

**Request**:
- `GET {{BASE_URL}}/api/bookings/redeem-vouchers`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.25 Ghi nhận booking lên blockchain

**Request**:
- `POST {{BASE_URL}}/api/bookings/blockchain/record`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.26 Tích hợp NFT cho booking

**Request**:
- `POST {{BASE_URL}}/api/bookings/blockchain/integrate-nft`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.27 Lấy hash on-chain của booking

**Request**:
- `POST {{BASE_URL}}/api/bookings/blockchain/onchain-hash`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.28 Xác thực hash blockchain

**Request**:
- `POST {{BASE_URL}}/api/bookings/blockchain/verify-hash`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.29 Xác minh blockchain bằng tx_hash

**Request**:
- `POST {{BASE_URL}}/api/bookings/blockchain/verify`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}",
	"tx_hash": "{{TX_HASH}}"
}
```

### 2.30 Test Seat API

**Request**:
- `GET {{BASE_URL}}/api/seats/test`

### 2.31 Debug: Seat Auth

**Request**:
- `POST {{BASE_URL}}/api/seats/debug-auth`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.32 Lấy danh sách ghế của chuyến bay

**Request**:
- `GET {{BASE_URL}}/api/seats/flight/1/seats`

### 2.33 Giữ chỗ (Reserve Seat)

**Request**:
- `POST {{BASE_URL}}/api/seats/reserve`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"flight_id": 1,
	"seat_codes": ["1A"]
}
```

### 2.34 Hủy giữ chỗ (Release Seat)

**Request**:
- `POST {{BASE_URL}}/api/seats/release`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"flight_id": 1,
	"seat_codes": ["1A"]
}
```

### 2.35 Dọn dẹp ghế hết hạn

**Request**:
- `POST {{BASE_URL}}/api/seats/cleanup-expired`

### 2.36 Đặt ghế (Book Seat)

**Request**:
- `POST {{BASE_URL}}/api/seats/book`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"flight_id": 1,
	"seat_codes": ["1A"],
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.37 Tạo vé máy bay

**Request**:
- `POST {{BASE_URL}}/api/tickets/generate`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.38 Lấy vé theo ID booking

**Request**:
- `GET {{BASE_URL}}/api/tickets/booking/1`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.39 Lấy chi tiết vé theo mã vé

**Request**:
- `GET {{BASE_URL}}/api/tickets/{{TICKET_CODE}}`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.40 Check-in vé

**Request**:
- `POST {{BASE_URL}}/api/tickets/{{TICKET_CODE}}/checkin`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.41 Hủy vé

**Request**:
- `POST {{BASE_URL}}/api/tickets/{{TICKET_CODE}}/cancel`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.42 Xác thực (Validate) vé

**Request**:
- `GET {{BASE_URL}}/api/tickets/validate/{{TICKET_CODE}}`

### 2.43 Tạo thanh toán VNPAY

**Request**:
- `POST {{BASE_URL}}/api/payment/vnpay/create`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}"
}
```

### 2.44 URL Return của VNPAY

**Request**:
- `GET {{BASE_URL}}/api/payment/vnpay/return`

### 2.45 Admin: Xác nhận thanh toán on-chain

**Request**:
- `POST {{BASE_URL}}/api/payment/admin/confirm-onchain`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}",
	"tx_hash": "{{TX_HASH}}"
}
```

### 2.46 Tạo thanh toán mới

**Request**:
- `POST {{BASE_URL}}/api/payment/create`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}",
	"amount": 1000000,
	"method": "VNPAY"
}
```

### 2.47 Xác nhận thanh toán

**Request**:
- `POST {{BASE_URL}}/api/payment/confirm`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"payment_id": 1,
	"status": "SUCCESS"
}
```

### 2.48 Lấy chi tiết thanh toán theo ID

**Request**:
- `GET {{BASE_URL}}/api/payment/1`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.49 Cập nhật trạng thái thanh toán

**Request**:
- `PATCH {{BASE_URL}}/api/payment/1/status`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"status": "SUCCESS"
}
```

### 2.50 Lấy danh sách thanh toán

**Request**:
- `GET {{BASE_URL}}/api/payment/`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.51 Đánh dấu đã thanh toán

**Request**:
- `POST {{BASE_URL}}/api/payment/mark-paid`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"booking_code": "{{BOOKING_CODE}}",
	"booking_hash": "<booking_hash>"
}
```

### 2.52 Lưu transaction hash blockchain

**Request**:
- `POST {{BASE_URL}}/api/payment/blockchain/save-hash`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"bookingId": "{{BOOKING_CODE}}",
	"txHash": "{{TX_HASH}}",
	"fromAddress": "{{WALLET_ADDRESS}}",
	"toAddress": "<receiver_address>"
}
```

### 2.53 Xác nhận transaction blockchain

**Request**:
- `POST {{BASE_URL}}/api/payment/blockchain/confirm`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"txHash": "{{TX_HASH}}",
	"status": "success",
	"details": {
		"confirmations": 1,
		"block_number": 123,
		"gas_used": 21000
	}
}
```

### 2.54 Gửi tin nhắn hỗ trợ

**Request**:
- `POST {{BASE_URL}}/api/support/message`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"subject": "Support request",
	"message": "Need help with booking"
}
```

### 2.55 Lấy danh sách tin nhắn hỗ trợ

**Request**:
- `GET {{BASE_URL}}/api/support/messages`
- Headers: `Authorization: Bearer {{TOKEN}}`

### 2.56 Tạo yêu cầu hỗ trợ (Ticket)

**Request**:
- `POST {{BASE_URL}}/api/support/ticket`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"subject": "Ticket issue",
	"description": "Details here"
}
```

### 2.57 Gửi thông tin liên hệ

**Request**:
- `POST {{BASE_URL}}/api/contact/submit`
- Body (JSON):
```json
{
	"name": "Nguyen Van A",
	"email": "test+skyplan@example.com",
	"message": "Hello SkyPlan"
}
```

### 2.58 Trò chuyện với AI (Chat)

**Request**:
- `POST {{BASE_URL}}/api/ai/chat`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (JSON):
```json
{
	"message": "Xin chào"
}
```

### 2.59 Lấy metadata NFT của vé

**Request**:
- `GET {{BASE_URL}}/api/metadata/ticket/{{BOOKING_CODE}}.json`

### 2.60 Lấy cấu hình blockchain

**Request**:
- `GET {{BASE_URL}}/api/metadata/blockchain-config`


## 3) Kiểm Thử Smart Contract (Thực Tế)

### 3.1 Gửi giao dịch MetaMask

Trên `payment.html`:
- Chọn **Thanh toán bằng Crypto** → **Gửi giao dịch**.
- Lưu lại `TX_HASH`.

### 3.2 Kiểm tra tx trên Explorer

Mở Sepolia Etherscan:
- `https://sepolia.etherscan.io/tx/{{TX_HASH}}`

**Kỳ vọng**:
- Status: **Success**
- `To` đúng contract/payment receiver.

### 3.3 Verify booking on-chain (BookingRegistry)

Nếu hệ thống ghi BookingRegistry (khi admin xác nhận thủ công hoặc thanh toán fiat):
- Dùng endpoint API kiểm tra:
	- `POST {{BASE_URL}}/api/bookings/blockchain/verify`
	- Headers: `Authorization: Bearer {{TOKEN}}`
	- Body:
```json
{
	"booking_code": "{{BOOKING_CODE}}",
	"tx_hash": "{{TX_HASH}}"
}
```

**Kỳ vọng**:
- `booking_status`: `CONFIRMED`
- Response có `booking_hash` khớp on-chain.

### 3.4 Kiểm tra PaymentRegistry (Thanh toán Crypto)

Mọi khoản thanh toán bằng Crypto (MetaMask) đều được ghi nhận trực tiếp vào hợp đồng `PaymentRegistry`.

**Cách kiểm tra**:
- Mở contract `PaymentRegistry` trên Sepolia Etherscan (lấy địa chỉ từ `PAYMENT_REGISTRY_ADDRESS` trong `.env`).
- Vào tab **Read Contract**, gọi hàm `isPaymentConfirmed(bookingCode, payer, amount)`.
  - `amount` là số Wei (VND * 10^18 / Tỷ giá).
- **Kỳ vọng**: Trả về `true`.
- Kiểm tra tab **Events** của giao dịch thanh toán: phải có event `PaymentConfirmed`.

### 3.5 Kiểm tra TicketNFT (Phát hành vé)

Vé máy bay SkyPlan được mint dưới dạng NFT (ERC-721).

**Cách kiểm tra**:
- Mở Sepolia Etherscan của ví thanh toán: `https://sepolia.etherscan.io/address/{{WALLET_ADDRESS}}#nfttransfers`
- **Kỳ vọng**:
  - Xuất hiện 1 giao dịch Mint chuẩn ERC-721 (TicketNFT) chuyển vào ví.
  - Trên trang "Chuyến đi của tôi", booking hiển thị nút **Xem vé NFT** với đúng Token ID.

### 3.6 Kiểm tra SKY Token (Phần thưởng)

Người dùng nhận SKY Token sau khi thanh toán thành công.

**Cách kiểm tra**:
- Mở Sepolia Etherscan của ví thanh toán: `https://sepolia.etherscan.io/address/{{WALLET_ADDRESS}}#tokentxns`
- Hoặc dùng API: `GET {{BASE_URL}}/api/bookings/wallets/{{WALLET_ADDRESS}}/sky-balance`
- **Kỳ vọng**:
  - Có 1 giao dịch Mint chuẩn ERC-20 (SKY) trên Etherscan.
  - API trả về `sky_balance` lớn hơn 0 và tương ứng với tỷ lệ cấu hình.

### 3.7 Kiểm tra Data Integrity (Tính toàn vẹn dữ liệu)

Đảm bảo trạng thái booking trên cơ sở dữ liệu và trên blockchain hoàn toàn đồng bộ.

**Cách kiểm tra**:
- Dùng API check mã băm:
  - `POST {{BASE_URL}}/api/bookings/blockchain/onchain-hash`
  - Body: `{"booking_code": "{{BOOKING_CODE}}"}`
- **Kỳ vọng**:
  - Response trả về `integrity.is_match: true`.
  - Nếu cố tình sửa đổi Database (tên hành khách, mã vé), API sẽ phát hiện và báo `is_match: false`.

---

## 4) Kiểm Tra WSS (Giảm Polling)

Trong console `payment.html` hoặc `confirmation.html`:

```js
const cfg = JSON.parse(sessionStorage.getItem('skyplan_blockchain_config_v2') || '{}');
const wss = cfg.sepoliaWssUrl;
console.log('WSS:', wss);
const ws = new WebSocket(wss);
ws.onopen = () => console.log('WSS open');
ws.onerror = (e) => console.log('WSS error', e);
ws.onclose = () => console.log('WSS closed');
```

**Kỳ vọng**:
- Thấy `WSS open`.
- Nếu không, sẽ fallback polling trong code frontend.

---

## 5) Lỗi Thường Gặp

- **401 Unauthorized**: Chưa login hoặc thiếu `Authorization: Bearer {{TOKEN}}`.
- **WSS không open**: Sai `SEPOLIA_WSS_URL` hoặc provider chưa bật WebSocket.
- **Tx pending lâu**: Kiểm tra gas, RPC, hoặc đổi provider.

