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

