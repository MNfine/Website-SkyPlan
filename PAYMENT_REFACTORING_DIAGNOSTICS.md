
# 🔍 Hướng Dẫn Chẩn Đoán - Refactor Payment

**Ngày**: May 7, 2026  
**Vấn đề**: Blockchain mint bị lỗi "Invalid operation" dù payment đã được xác minh  
**Nguyên nhân gốc**: Các bước kiểm tra eligibility chưa đầy đủ

---

## ✅ Các Kiểm Tra Eligibility Được Nâng Cấp

Hàm `_is_reward_eligible()` hiện xác thực:

```python
1. ✓ Payment được xác minh bởi BẤT KỲ kênh nào
2. ✓ Booking có status = CONFIRMED (không chỉ verified)
3. ✓ Booking có booking_hash (bắt buộc để ghi on-chain)  ← MỚI
4. ✓ NFT/SKY chưa được mint trước đó
5. ✓ Có wallet address
6. ✓ Wallet là địa chỉ Ethereum hợp lệ
````

---

## 🐛 Checklist Các Lỗi Thường Gặp

### Lỗi: "Booking missing booking_hash"

**Ý nghĩa:**
Booking chưa có field `booking_hash`. Giá trị này phải được tạo khi booking được tạo mới.

**Cách khắc phục:**

1. Kiểm tra `backend/routes/bookings.py` — quá trình tạo booking phải sinh hash
2. Tìm nơi gán `booking.booking_hash = ...`
3. Hash nên là keccak256 từ dữ liệu booking (hex có prefix `0x`)

**Ví dụ log:**

```text
[reward] ⚠️ Skipped for SP202682322: Booking missing booking_hash
```

### Lỗi: "Booking not confirmed (status=PENDING)"

**Ý nghĩa:**
Booking chưa được cập nhật sang trạng thái `CONFIRMED`. Quá trình mark-paid thất bại hoặc chưa cập nhật status.

**Cách khắc phục:**

1. Đảm bảo endpoint `/mark-paid` chạy thành công
2. Kiểm tra database:

   ```sql
   SELECT status FROM bookings WHERE booking_code='SP202682322';
   ```
3. Status phải là `CONFIRMED` sau khi thanh toán

**Ví dụ log:**

```text
[reward] ⚠️ Skipped for SP202682322: Booking not confirmed (status=PENDING)
```

### Lỗi: "Payment not verified by any channel"

**Ý nghĩa:**
Field `verified_by` chưa được set trên record Payment.

**Cách khắc phục:**

1. Đảm bảo quá trình tạo payment có set field `verified_by`
2. Kiểm tra cả 3 luồng thanh toán đều set:

   * VNPay callback:

     ```python
     payment.verified_by = 'vnpay'
     ```
   * Blockchain confirm:

     ```python
     payment.verified_by = 'blockchain'
     ```
   * Manual `/mark-paid`:

     ```python
     verified_by = 'vnpay'|'manual'|'blockchain'
     ```

**Ví dụ log:**

```text
[reward] ⚠️ Skipped for SP202682322: Payment not verified by any channel
```

### Lỗi: "Booking has no wallet address"

**Ý nghĩa:**
Booking chưa có `wallet_address`. Người dùng cần kết nối ví.

**Cách khắc phục:**

1. Với blockchain payment: user phải truyền `fromAddress` vào `/blockchain/save-hash`
2. Với các phương thức thanh toán khác: user nên lưu wallet trong profile
3. HOẶC: wallet có thể được tự động lấy từ phương thức thanh toán

**Ví dụ log:**

```text
[reward] ⚠️ Skipped for SP202682322: Booking has no wallet address for reward distribution
```

---

## 📊 Chẩn Đoán Luồng Thanh Toán

### Test Thanh Toán VNPay (giờ sẽ mint reward nếu có wallet!)

```text
1. POST /api/payment/vnpay/create
   → Nhận URL thanh toán VNPay
   
2. User hoàn tất thanh toán VNPay
   → Gateway gọi /api/payment/vnpay/return
   
3. Callback handler VNPay chạy:
   ✓ Verify HMAC signature
   ✓ Set payment.verified_by = 'vnpay'  ← GIỜ ĐÃ TRACK NGUỒN
   ✓ Kiểm tra eligibility
   ✓ Mint NFT/SKY nếu đủ điều kiện
   
4. Log mong đợi:
   [payment-verified] ✓ source=vnpay for SP202682322
   [reward] ✓ Minting triggered for SP202682322: Eligible for rewards
   [blockchain] ✅ SP202682322: NFT and SKY minted successfully
```

### Test Thanh Toán Blockchain

```text
1. User gửi ETH qua MetaMask
   → PaymentRegistry.recordPayment()
   
2. Frontend gọi /blockchain/confirm
   ✓ Verify Bearer token + ownership
   ✓ Set payment.verified_by = 'blockchain'  ← TRACK NGUỒN
   ✓ Kiểm tra eligibility
   ✓ Mint NFT/SKY bằng background thread
   
4. Log mong đợi:
   [payment-verified] ✓ source=blockchain for SP202682322
   [reward] ✓ Minting triggered for SP202682322: Eligible for rewards
   [blockchain] ✅ SP202682322: NFT and SKY minted successfully
```

### Test Manual /mark-paid

```text
1. Admin gọi POST /api/payment/mark-paid
   ✓ Verify Bearer token + booking ownership
   ✓ Verify payment (kiểm tra blockchain nếu crypto, bỏ qua nếu fiat)
   ✓ Set payment.verified_by = 'vnpay'|'manual'|'blockchain'
   ✓ Kiểm tra eligibility
   ✓ Mint NFT/SKY nếu đủ điều kiện
   
4. Log mong đợi:
   [payment-verified] ✓ source=manual for SP202682322
   [reward] ✓ Minting triggered for SP202682322: Eligible for rewards
   [blockchain] ✅ SP202682322: NFT and SKY minted successfully
```

---

## 🔧 Các Bước Debug

### 1. Kiểm Tra Payment Record

```sql
SELECT 
  id,
  booking_code,
  provider,
  verified_by,      -- Field mới để track nguồn xác minh
  status,
  created_at
FROM payments
WHERE booking_code = 'SP202682322';
```

Kỳ vọng: `verified_by` phải là `'blockchain'`, `'vnpay'`, hoặc `'manual'`

### 2. Kiểm Tra Booking Record

```sql
SELECT 
  id,
  booking_code,
  status,
  wallet_address,
  booking_hash,     -- Bắt buộc để ghi on-chain
  onchain_recorded,
  nft_minted,
  sky_minted
FROM bookings
WHERE booking_code = 'SP202682322';
```

Kỳ vọng:

* `status` = `CONFIRMED`
* `wallet_address` = `0x...` (địa chỉ Ethereum)
* `booking_hash` = `0x...` (hash hex 32-byte)
* `onchain_recorded` = `TRUE`
* `nft_minted` = `TRUE`
* `sky_minted` = `TRUE`

### 3. Bật Debug Logging

Tìm các pattern log sau:

```text
[payment-verified] ✓ source=...     ← Xác minh thành công
[reward] ✓ Minting triggered for... ← Eligibility đạt
[reward] ⚠️ Skipped for...          ← Eligibility thất bại (xem lý do)
[blockchain] ✅ ...                  ← Mint NFT/SKY thành công
[blockchain] ⚠️ ...                  ← Mint thất bại
```

---

## 📝 Migration & Deploy

### Trước khi deploy production:

1. **Chạy migration để thêm cột `verified_by`:**

   ```bash
   python backend/db/add_verified_by_column.py
   ```

2. **Cập nhật dữ liệu payment cũ:**

   ```sql
   UPDATE payments 
   SET verified_by = CASE 
     WHEN provider = 'blockchain' THEN 'blockchain'
     WHEN provider IN ('vnpay', 'bank') THEN provider
     ELSE 'unknown'
   END
   WHERE verified_by IS NULL;
   ```

3. **Test các luồng thanh toán:**

   * ✓ VNPay payment có wallet → phải mint
   * ✓ VNPay payment không có wallet → bỏ qua reward
   * ✓ Blockchain payment → phải mint
   * ✓ Manual `/mark-paid` → mint nếu đủ điều kiện

4. **Theo dõi log:**

   * Tìm `[reward] ✓` (thành công)
   * Tìm `[reward] ⚠️` (không đủ điều kiện - xem lý do)
   * Tìm `[blockchain] ✅` (mint thành công)

---

## 🎯 Tổng Quan Kiến Trúc

**Nguyên tắc**: Verify theo channel → Reward theo policy

```text
Payment Received
    ↓
Xác minh theo từng kênh:
  • Blockchain: Kiểm tra PaymentRegistry
  • VNPay: Verify HMAC + gateway
  • Manual: Kiểm tra Bearer token
    ↓
SET field verified_by (track nguồn)
    ↓
KIỂM TRA ELIGIBILITY (độc lập):
  • Được verify bởi bất kỳ channel nào?
  • Status là CONFIRMED?
  • Có booking_hash?
  • Có wallet?
  • Chưa mint trước đó?
    ↓
CẤP REWARD nếu đủ điều kiện (mint NFT + SKY)
```

---

## ✅ Checklist Deploy

* [ ] Đã chạy migration: `add_verified_by_column.py`
* [ ] Payment cũ đã được update `verified_by`
* [ ] Syntax check passed: ✓
* [ ] Đã test VNPay flow: payment → rewards
* [ ] Đã test Blockchain flow: payment → rewards
* [ ] Đã test Manual `/mark-paid`: payment → rewards
* [ ] Log có `[payment-verified]` cho mỗi payment
* [ ] Log có `[reward] ✓` cho booking hợp lệ
* [ ] Database đã có cột mới `payments.verified_by`

---

**Trạng thái**: ✅ Sẵn sàng deploy sau khi hoàn thành checklist
**Bước tiếp theo**: Chạy migration + test cả 3 luồng thanh toán
**Monitoring**: Theo dõi log `[payment-verified]` và `[reward]`

```
