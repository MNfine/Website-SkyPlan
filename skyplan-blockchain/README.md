# 🛫 SkyPlan Blockchain Node & Smart Contracts

> Môi trường phát triển Smart Contract và Web3 tích hợp cho hệ sinh thái SkyPlan, sử dụng Hardhat 3 Beta.

Dự án này chứa mã nguồn các Smart Contract (viết bằng Solidity) chịu trách nhiệm quản lý điểm thưởng (SKY Token) và vé máy bay dưới dạng NFT (Non-Fungible Token) cho nền tảng SkyPlan.

---

## 📦 Kiến trúc & Công nghệ

- **Framework:** [Hardhat 3 Beta](https://hardhat.org/)
- **Ngôn ngữ Contract:** Solidity `^0.8.20`
- **Ngôn ngữ Scripting:** TypeScript / Node.js
- **Tiêu chuẩn Token:** ERC-20 (SKY Token) & ERC-721 (NFT Tickets)

## 🚀 Tính năng Web3 của SkyPlan

1. **SKY Token (ERC-20):** 
   - Token phần thưởng nội bộ. 
   - Người dùng có thể nhận token khi bay, hoàn thành chuyến đi hoặc tham gia các chương trình khuyến mãi.
   - Sử dụng SKY Token để đổi voucher hoặc nâng hạng ghế.
   
2. **NFT Ticketing (ERC-721):**
   - Chuyển đổi vé máy bay truyền thống thành NFT.
   - Hỗ trợ lưu trữ vé vĩnh viễn trên blockchain.
   - Đảm bảo tính minh bạch, chống giả mạo và dễ dàng chuyển nhượng (nếu chính sách cho phép).
   
3. **Thanh toán Crypto:**
   - Cung cấp giao thức thanh toán bằng Ethereum (ETH) trực tiếp qua Web3/MetaMask trên frontend.

## 🛠 Hướng dẫn cài đặt & Chạy Local

### 1. Yêu cầu hệ thống
- **Node.js** `v18.x` hoặc mới hơn.
- **npm** hoặc **yarn**.
- (Tùy chọn) Ví MetaMask extension trên trình duyệt để test giao dịch.

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Biên dịch Smart Contracts
Biên dịch các contract trong thư mục `contracts/` thành bytecode và tạo ABI (lưu tại `artifacts/`).
```bash
npx hardhat compile
```

### 4. Chạy Hardhat Local Network
Khởi chạy một node blockchain cục bộ. Terminal này cần được giữ mở. Hardhat sẽ tự động cung cấp 20 tài khoản test với 10000 ETH mỗi tài khoản.
```bash
npx hardhat node
```

### 5. Deploy Smart Contracts (Testnet/Local)
Mở một terminal mới và chạy script deploy (đảm bảo Hardhat node đang chạy nếu deploy local):
```bash
npx hardhat run scripts/deploy.ts --network localhost
```
*Lưu ý: Sau khi deploy, copy các địa chỉ contract hiển thị trên terminal và cấu hình lại vào `.env` của backend hoặc cấu hình Web3 của frontend.*

### 6. Chạy Test Suites
Chạy các kịch bản kiểm thử tự động cho Smart Contract:
```bash
npx hardhat test
```

---

## 🔒 Bảo mật & Lưu ý

- **Không bao giờ** commit file `.env` chứa `PRIVATE_KEY` hoặc các thông tin nhạy cảm của ví deployer lên repository.
- Luôn kiểm tra kỹ ABI trước khi copy sang thư mục của Frontend/Backend.
- Mọi logic liên quan đến hoàn vé (Refund/Cancel) đều tương tác mật thiết với Event của Smart Contract, đảm bảo node backend luôn lắng nghe đúng địa chỉ và ABI.
