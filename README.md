<div align="center">
  <h1>✈️ SkyPlan</h1>
  <p><strong>Nền tảng Đặt vé Máy bay Hiện đại tích hợp Blockchain & Trí tuệ Nhân tạo</strong></p>
</div>

---

SkyPlan là một hệ sinh thái đặt vé máy bay toàn diện với thiết kế giao diện cao cấp, đem lại trải nghiệm mượt mà cho người dùng. Không chỉ dừng lại ở các tính năng truyền thống như tìm kiếm, chọn ghế, thanh toán VNPay, SkyPlan còn tiên phong tích hợp công nghệ **Web3 (Blockchain)** và hệ thống quản lý **Vé NFT**, cùng phần thưởng **SKY Token**.

## 📑 Mục lục
- [✨ Tính năng Nổi bật](#-tính-năng-nổi-bật)
- [📦 Cấu trúc Dự án](#-cấu-trúc-dự-án)
- [🛠 Yêu cầu Hệ thống](#-yêu-cầu-hệ-thống)
- [🚀 Hướng dẫn Cài đặt & Chạy Local](#-hướng-dẫn-cài-đặt--chạy-local)
- [🔐 Biến Môi trường (Environment Variables)](#-biến-môi-trường-environment-variables)
- [📚 Tài liệu Kiến trúc](#-tài-liệu-kiến-trúc)
- [🤝 Hướng dẫn Đóng góp](#-hướng-dẫn-đóng-góp)

---

## ✨ Tính năng Nổi bật

1. **Giao diện Tối ưu (UI/UX):** Vanilla HTML/CSS/JS được tối ưu hóa cho tốc độ phản hồi cực nhanh, hỗ trợ Responsive và đa ngôn ngữ (Tiếng Anh / Tiếng Việt).
2. **Luồng Booking Hoàn chỉnh:** Từ tìm kiếm chuyến bay khứ hồi/một chiều, chọn ghế tương tác, mua hành lý/suất ăn đến tóm tắt thanh toán chi tiết.
3. **Thanh toán Đa kênh:**
   - Cổng thanh toán **VNPay**.
   - Thanh toán qua ví điện tử.
   - Thanh toán phi tập trung bằng **Ethereum (ETH)** thông qua MetaMask.
4. **Tích hợp Web3 (Blockchain):**
   - Đúc (Mint) vé máy bay dưới dạng **NFT**.
   - Tích điểm thưởng **SKY Token** khi hoàn thành chuyến bay hoặc hủy vé theo chính sách.
5. **Dữ liệu Thời gian thực:** Backend Flask kết hợp PostgreSQL cung cấp dữ liệu chính xác, xử lý concurrency an toàn.

---

## 📦 Cấu trúc Dự án

Repository được chia thành 3 phân hệ chính:

- 📂 **`frontend/`**: Giao diện người dùng tĩnh. Chứa các file HTML, CSS (Tailwind/Vanilla) và thư mục `assets/scripts` chịu trách nhiệm xử lý logic phía client.
- 📂 **`backend/`**: Hệ thống API Server viết bằng **Python Flask**. Xử lý nghiệp vụ, giao tiếp cơ sở dữ liệu (SQLAlchemy) và tích hợp các SDK (VNPay, Web3.py).
- 📂 **`skyplan-blockchain/`**: Node và mã nguồn Smart Contract (Solidity) chạy trên môi trường **Hardhat**.

---

## 🛠 Yêu cầu Hệ thống

Để chạy toàn bộ dự án ở môi trường Local, bạn cần:

- **Python** `3.10` trở lên.
- **Node.js** `v18.x` trở lên (Dành cho phân hệ Blockchain).
- **PostgreSQL** `13+` (Mặc định). Có thể cấu hình dùng SQLite để test nhanh.
- **Git**.

---

## 🚀 Hướng dẫn Cài đặt & Chạy Local

### Bước 1: Clone Repository
```bash
git clone <repo-url> SkyPlan
cd SkyPlan
```

### Bước 2: Thiết lập Backend (Python)
Mở terminal (Windows PowerShell/Command Prompt):
```powershell
# 1. Tạo và kích hoạt môi trường ảo (Virtual Environment)
python -m venv .venv
.\.venv\Scripts\Activate

# 2. Cài đặt các gói phụ thuộc
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Khởi tạo file biến môi trường
copy .env.example .env
```
*(Mở file `.env` vừa tạo và cập nhật `DATABASE_URL`, `SECRET_KEY`, thông tin `VNPAY`... cho phù hợp với môi trường của bạn).*

### Bước 3: Khởi tạo Dữ liệu (Database Seed)
Chạy các script sau để tự động tạo bảng, tạo dữ liệu chuyến bay mẫu và sơ đồ ghế ngồi:
```powershell
python backend/db/import_flights.py
python backend/db/create_all_seats.py
```

### Bước 4: Chạy Backend Server
Backend Flask sẽ phục vụ cả các API và các trang Frontend tĩnh.
```powershell
python backend/app.py
```
> 🌐 Mở trình duyệt và truy cập: **http://localhost:5000**

---

## 🔐 Biến Môi trường (Environment Variables)

Hệ thống cấu hình dựa trên file `.env` đặt tại thư mục gốc của repository. Một số biến quan trọng bao gồm:

- `SECRET_KEY`: Khóa bảo mật của Flask (Bắt buộc).
- `DATABASE_URL`: Chuỗi kết nối Database. Ví dụ: `postgresql+psycopg2://postgres:password@localhost:5432/skyplan`.
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`: Thông tin cấu hình thanh toán VNPay Sandbox/Production.
- `WEB3_PROVIDER_URI`, `CONTRACT_ADDRESS`: Cấu hình kết nối node blockchain và địa chỉ Smart Contract.

⚠️ **Lưu ý:** Tuyệt đối KHÔNG commit file `.env` chứa dữ liệu thật lên Git.

---

## 📚 Tài liệu Kiến trúc

Để hiểu rõ hơn về cách các module giao tiếp với nhau, luồng xử lý thanh toán, và cấu trúc database, vui lòng tham khảo các tài liệu nội bộ:
- 📖 [Kiến trúc Tổng thể & Dòng chảy Dữ liệu (docs/architecture.md)](docs/architecture.md)
- 📖 [Hướng dẫn Setup Deployment lên Render (docs/render-setup.md)](docs/render-setup.md)
- 📖 [Readme Phân hệ Blockchain (skyplan-blockchain/README.md)](skyplan-blockchain/README.md)

---

## 🤝 Hướng dẫn Đóng góp (Contributing)

Chúng tôi hoan nghênh mọi đóng góp để hoàn thiện SkyPlan! Vui lòng tuân thủ quy trình sau:
1. Cập nhật nhánh `main` mới nhất.
2. Tạo nhánh tính năng mới: `git checkout -b feature/ten-tinh-nang`.
3. Commit code với thông điệp rõ ràng, dễ hiểu.
4. Push nhánh của bạn lên repository: `git push origin feature/ten-tinh-nang`.
5. Tạo Pull Request (PR) để được review.

*Vui lòng đảm bảo code của bạn tuân thủ các convention của dự án và không làm vỡ các Unit Test hiện tại.*

---
<div align="center">
  <p>Developed with ❤️ by the SkyPlan Team.</p>
</div>
