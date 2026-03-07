# Booking Off-Chain API Documentation

## Tổng quan (Overview)

API Booking Off-Chain cho phép tạo đặt chỗ trên hệ thống SkyPlan với tích hợp blockchain. Mỗi booking sẽ có:
- **booking_code**: Mã đặt chỗ duy nhất (VD: SP202512345)
- **booking_hash**: Hash keccak256 của booking_code (để ghi lên blockchain)
- **wallet_address**: Địa chỉ ví Ethereum của người dùng (tùy chọn)

## 1. API Tạo Booking (Create Booking)

### Endpoint
```
POST /api/bookings/create
```

### Authentication
```
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
```json
{
  "outbound_flight_id": 1,
  "inbound_flight_id": 2,
  "trip_type": "round-trip",
  "fare_class": "economy",
  "total_amount": 2500000,
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "passengers": [1, 2],
  "seats": [
    {
      "seat_code": "1A",
      "seat_id": 1
    }
  ]
}
```

### Hoặc với guest passenger
```json
{
  "outbound_flight_id": 1,
  "trip_type": "one-way",
  "fare_class": "economy",
  "total_amount": 1200000,
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "guest_passenger": {
    "lastname": "Nguyen",
    "firstname": "Van A",
    "cccd": "123456789012",
    "dob": "1990-01-15",
    "gender": "Nam",
    "phone_number": "0912345678",
    "email": "nguyenvana@example.com",
    "address": "123 Le Loi St",
    "city": "Ho Chi Minh",
    "nationality": "Viet Nam"
  }
}
```

### Response Success (201)
```json
{
  "success": true,
  "booking_code": "SP202512345",
  "booking_id": 1,
  "booking_hash": "0xe99b4eba6af4901ce408239f161a51b7e4e39a8a581e3bf7a70a4c208d89e66d",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "booking": {
    "id": 1,
    "booking_code": "SP202512345",
    "user_id": 1,
    "status": "PENDING",
    "trip_type": "ROUND_TRIP",
    "fare_class": "ECONOMY",
    "total_amount": 2500000.0,
    "booking_hash": "0xe99b4eba6af4901ce408239f161a51b7e4e39a8a581e3bf7a70a4c208d89e66d",
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "created_at": "2026-01-20T10:30:00",
    "confirmed_at": null,
    "passengers": [...],
    "outbound_flight": {...},
    "inbound_flight": {...}
  }
}
```

### Response Error (400/404/500)
```json
{
  "success": false,
  "message": "Error description"
}
```

## 2. API Lấy Thông Tin Blockchain (Get Blockchain Info)

Endpoint này trả về thông tin cần thiết để ghi booking lên blockchain Sepolia.

### Endpoint
```
POST /api/bookings/blockchain/record
```

### Authentication
```
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
```json
{
  "booking_code": "SP202512345"
}
```

### Response Success (200)
```json
{
  "success": true,
  "booking_code": "SP202512345",
  "booking_hash": "0xe99b4eba6af4901ce408239f161a51b7e4e39a8a581e3bf7a70a4c208d89e66d",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "Use these values to call BookingRegistry.recordBooking() from your wallet"
}
```

## 3. Cấu Trúc Database

### Bảng `bookings`
```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_code VARCHAR(32) UNIQUE NOT NULL,
    user_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    trip_type VARCHAR(20) NOT NULL,
    fare_class VARCHAR(30) NOT NULL,
    outbound_flight_id INTEGER NOT NULL,
    inbound_flight_id INTEGER,
    total_amount NUMERIC(12, 2) NOT NULL,
    booking_hash VARCHAR(66),  -- NEW: Keccak256 hash
    wallet_address VARCHAR(42), -- NEW: Ethereum address
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (outbound_flight_id) REFERENCES flights(id),
    FOREIGN KEY (inbound_flight_id) REFERENCES flights(id)
);

CREATE INDEX idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

## 4. Booking Hash Generation

Hash được tạo bằng thuật toán Keccak256 (giống Solidity):

```python
from Crypto.Hash import keccak

def generate_booking_hash_simple(booking_code: str) -> str:
    k = keccak.new(digest_bits=256)
    k.update(booking_code.encode('utf-8'))
    return '0x' + k.hexdigest()
```

Ví dụ:
- Input: `SP202512345`
- Output: `0xe99b4eba6af4901ce408239f161a51b7e4e39a8a581e3bf7a70a4c208d89e66d`

## 5. Flow Tích Hợp Blockchain

### 5.1 Tạo Booking (Backend)
```
1. User gọi POST /api/bookings/create với wallet_address
2. Backend:
   - Tạo booking_code (SP202512345)
   - Sinh booking_hash = keccak256(booking_code)
   - Lưu vào PostgreSQL: booking_code, booking_hash, wallet_address, status=PENDING
   - Trả về: booking_code, booking_hash, booking_id
```

### 5.2 Ghi Lên Blockchain (Frontend với MetaMask)
```
3. Frontend nhận booking_hash từ response
4. Gọi Smart Contract BookingRegistry.recordBooking():
   - bookingCode (string): "SP202512345"
   - bookingHash (bytes32): 0xe99b4eba6af4901ce408239f161a51b7e4e39a8a581e3bf7a70a4c208d89e66d
5. User ký transaction bằng MetaMask
6. Transaction được ghi trên Sepolia testnet
```

### 5.3 Xác Nhận Thanh Toán
```
7. User thanh toán qua VNPay
8. Backend cập nhật status = CONFIRMED, confirmed_at = now()
9. Booking hoàn tất!
```

## 6. Testing

### 6.1 Test Hash Generation
```bash
cd backend
python -c "from utils.blockchain import generate_booking_hash_simple; print(generate_booking_hash_simple('SP202512345'))"
```

### 6.2 Test Create Booking API
```bash
# Login first to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Create booking
curl -X POST http://localhost:5000/api/bookings/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "outbound_flight_id": 1,
    "trip_type": "one-way",
    "fare_class": "economy",
    "total_amount": 1200000,
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "guest_passenger": {
      "lastname": "Test",
      "firstname": "User",
      "cccd": "123456789012",
      "dob": "1990-01-15",
      "gender": "Nam",
      "phone_number": "0912345678",
      "email": "test@example.com",
      "address": "123 Test St",
      "city": "Ho Chi Minh",
      "nationality": "Viet Nam"
    }
  }'
```

### 6.3 Test Get Blockchain Info
```bash
curl -X POST http://localhost:5000/api/bookings/blockchain/record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"booking_code":"SP202512345"}'
```

## 7. Smart Contract Integration

### BookingRegistry.sol (Sepolia)
```solidity
function recordBooking(
    string memory bookingCode,
    bytes32 bookingHash
) external {
    require(bookings[bookingHash].timestamp == 0, "Booking already exists");
    
    bookings[bookingHash] = Booking({
        bookingCode: bookingCode,
        owner: msg.sender,
        timestamp: block.timestamp,
        status: BookingStatus.Active
    });
    
    emit BookingRecorded(bookingHash, bookingCode, msg.sender);
}
```

### Frontend Call (ethers.js)
```javascript
import { ethers } from 'ethers';

async function recordBookingOnChain(bookingCode, bookingHash) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const contract = new ethers.Contract(
    BOOKING_REGISTRY_ADDRESS,
    BOOKING_REGISTRY_ABI,
    signer
  );
  
  const tx = await contract.recordBooking(bookingCode, bookingHash);
  await tx.wait();
  
  console.log('Booking recorded on blockchain:', tx.hash);
}
```

## 8. Dependencies

### Backend (requirements.txt)
```
Flask==2.3.3
flask-cors==4.0.0
SQLAlchemy==2.0.36
psycopg2-binary==2.9.10
PyJWT==2.8.0
pycryptodome==3.20.0  # For keccak256
```

### Blockchain (package.json)
```json
{
  "dependencies": {
    "hardhat": "^3.1.7",
    "ethers": "^6.16.0",
    "@openzeppelin/contracts": "^5.4.0"
  }
}
```

## 9. Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/skyplan
SECRET_KEY=your-secret-key
```

### Blockchain (skyplan-blockchain/.env)
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your-metamask-private-key
BOOKING_REGISTRY_ADDRESS=0x... (deployed contract address)
```

## 10. Status Flow

```
PENDING → CONFIRMED → COMPLETED
   ↓
PAYMENT_FAILED / CANCELLED / EXPIRED
```

- **PENDING**: Booking vừa tạo, chưa thanh toán
- **CONFIRMED**: Đã thanh toán thành công
- **PAYMENT_FAILED**: Thanh toán thất bại
- **CANCELLED**: User hủy booking
- **EXPIRED**: Booking hết hạn (quá 24h chưa thanh toán)
- **COMPLETED**: Đã hoàn thành chuyến bay

## Support

Nếu có vấn đề, liên hệ:
- GitHub Issues: https://github.com/MNfine/Website-SkyPlan/issues
- Email: support@skyplan.vn
