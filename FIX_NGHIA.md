# ✅ Tổng Hợp Sửa Đổi WSS (Realtime) - SkyPlan

**Ngày**: May 9, 2026  
**Trạng thái**: ✅ ĐÃ CẬP NHẬT  
**Mục tiêu**: Dùng WSS để giảm polling khi xác nhận giao dịch blockchain

---

## Tóm Tắt Điều Hành

Đã triển khai hỗ trợ WSS cho luồng thanh toán blockchain và bổ sung cấu hình cần thiết từ backend → frontend. Khi WSS không khả dụng, hệ thống tự động fallback về polling như trước.

---

## Nội Dung Đã Sửa

### 1) Backend cấu hình WSS

**File chỉnh sửa**:
- `backend/config.py`
- `backend/routes/metadata.py`

**Thay đổi chính**:
- Thêm biến môi trường `SEPOLIA_WSS_URL`.
- Expose `sepoliaWssUrl` qua endpoint `GET /api/metadata/blockchain-config` để frontend nhận cấu hình.

---

### 2) Frontend ưu tiên WSS, fallback polling

**File chỉnh sửa**:
- `frontend/assets/scripts/blockchain-payment.js`

**Thay đổi chính**:
- Load `sepoliaWssUrl` từ config server.
- Dùng WebSocket (`eth_subscribe` + `newHeads`) để kiểm tra receipt nhanh theo block mới.
- Nếu WSS lỗi/timeout, tự động chuyển về polling `eth_getTransactionReceipt`.

---

### 3) Mẫu cấu hình môi trường

**File chỉnh sửa**:
- `.env.example`

**Thay đổi chính**:
- Thêm dòng mẫu:
	- `SEPOLIA_WSS_URL=wss://eth-sepolia.g.alchemy.com/v2/<API_KEY>`

---

## Kiểm Tra Thực Tế

### Endpoint config (đã OK)
Truy cập:
- `http://localhost:5000/api/metadata/blockchain-config`

Kỳ vọng:
- Trường `sepoliaWssUrl` xuất hiện trong JSON.

### Kiểm tra nhanh WSS trong Console

```js
const cfg = JSON.parse(sessionStorage.getItem('skyplan_blockchain_config_v2') || '{}');
const wss = cfg.sepoliaWssUrl;
console.log('WSS:', wss);
const ws = new WebSocket(wss);
ws.onopen = () => console.log('WSS open');
ws.onerror = (e) => console.log('WSS error', e);
ws.onclose = () => console.log('WSS closed');
```

---

## Ghi Chú

- Nếu thiếu `skyplan_blockchain_config_v2` trong Session Storage, hãy reload `payment.html` để frontend fetch config mới.
- Các endpoint `/api/payment/blockchain/save-hash` và `/confirm` yêu cầu Bearer token; nếu chưa đăng nhập sẽ bị `401`.

---

## Tệp Đã Thay Đổi

```
backend/config.py
backend/routes/metadata.py
frontend/assets/scripts/blockchain-payment.js
.env.example
```

---

## Trạng Thái

- ✅ Backend trả `sepoliaWssUrl`
- ✅ Frontend ưu tiên WSS, fallback polling
- ✅ Mẫu env đã cập nhật

---
---

# ✅ Sửa Lỗi Booking Khách Hiện Trong My Trips Của User Đã Đăng Nhập

**Ngày**: May 9, 2026  
**Trạng thái**: ✅ ĐÃ SỬA  
**Mục tiêu**: Ngăn booking khách (`user_id = null`) bị tự động gán cho tài khoản đã đăng nhập khi truy cập trang "Chuyến đi của tôi"

---

## Mô Tả Lỗi

Khi user đăng nhập (có kết nối ví MetaMask) truy cập trang **My Trips**, các booking khách (`user_id = null`) bị **tự động "claim"** (gán `user_id`) cho tài khoản đang đăng nhập → dẫn đến booking khách hiện sai trong danh sách chuyến đi.

**Ví dụ thực tế**: Booking `SP202635595` (STT 15) có `user_id = null` nhưng hiện trong My Trips của user có `user_id = 1`.

---

## Nguyên Nhân Gốc

Có **3 cơ chế auto-claim** chạy ngầm khi trang My Trips load:

| # | Vị trí | Hành vi sai |
|---|--------|-------------|
| 1 | `my_trips.js` → `claimBookingFromContextIfNeeded()` | Đọc `lastBookingCode` / `currentBookingCode` từ localStorage → gọi `/api/bookings/{code}/claim` tự động |
| 2 | `my_trips.js` → `loadUserTrips()` | Đọc booking code từ localStorage → gửi lên backend qua query param |
| 3 | `bookings.py` → `get_my_trips()` | Nếu nhận `booking_code` param và booking đó có `user_id = null` → tự gán `user_id` cho user đang đăng nhập |

**Luồng lỗi:**
1. User đặt vé khách → `lastBookingCode` lưu vào localStorage
2. User đăng nhập → vào My Trips
3. Frontend đọc localStorage → gọi `/claim` + gửi `booking_code` lên `/my-trips`
4. Backend gán `user_id` cho booking khách → booking xuất hiện sai trong My Trips

---

## Nội Dung Đã Sửa

### 1) Vô hiệu hóa auto-claim trong frontend

**File**: `frontend/assets/scripts/my_trips.js`

**Thay đổi**:
- Hàm `claimBookingFromContextIfNeeded()`: Xóa toàn bộ logic auto-claim, chỉ giữ `return;`. Việc claim booking chỉ được thực hiện qua hành động chủ động của user (nút "Tích hợp ngay").
- Hàm `loadUserTrips()`: Xóa việc đọc `lastBookingCode` / `currentBookingCode` từ localStorage. Chỉ dùng `booking_code` từ URL params (redirect rõ ràng từ trang xác nhận).

### 2) Xóa auto-claim trong backend endpoint `/my-trips`

**File**: `backend/routes/bookings.py`

**Thay đổi**:
- Endpoint `get_my_trips()`: Xóa block code tự động claim booking khách khi nhận `booking_code` query param. Việc claim chỉ được thực hiện qua endpoint `/api/bookings/{code}/claim` một cách rõ ràng.

### 3) Reset dữ liệu bị ảnh hưởng

- Booking `SP202635595` (STT 15): Reset `user_id` từ `1` về `null` trong database.

---

## Tệp Đã Thay Đổi

```
frontend/assets/scripts/my_trips.js
backend/routes/bookings.py
```

---

## Trạng Thái

- ✅ Frontend không còn auto-claim booking khách từ localStorage
- ✅ Backend `/my-trips` không còn tự gán `user_id` cho booking khách
- ✅ Endpoint `/api/bookings/{code}/claim` vẫn hoạt động cho claim thủ công
- ✅ Database đã reset booking bị ảnh hưởng

