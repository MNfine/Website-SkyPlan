# ✈️ SkyPlan - Website Đặt Vé Máy Bay

## 📋 Giới thiệu

**SkyPlan** là một website đặt vé máy bay nội địa Việt Nam được phát triển như đồ án môn học **IE104 - Công nghệ Web**. Website cung cấp trải nghiệm đặt vé máy bay trực tuyến hoàn chỉnh với giao diện thân thiện, hỗ trợ đa ngôn ngữ (Tiếng Việt/Tiếng Anh) và tích hợp thanh toán VNPay.

## ✨ Tính năng chính

### 🔍 Tìm kiếm & Đặt vé
- Tìm kiếm chuyến bay theo điểm đi/đến, ngày bay
- Bộ lọc theo giá, thời gian bay
- Hiển thị kết quả tìm kiếm với thông tin chi tiết

### 🎫 Quy trình đặt vé hoàn chỉnh
1. **Tìm kiếm** - Chọn điểm đi/đến và ngày bay
2. **Chọn chuyến bay** - Xem và chọn chuyến bay phù hợp
3. **Chọn giá vé** - Economy, Premium Economy, Business
4. **Chọn ghế** - Giao diện chọn ghế trực quan
5. **Thông tin hành khách** - Nhập thông tin cá nhân
6. **Dịch vụ thêm** - Hành lý, bảo hiểm, suất ăn
7. **Thanh toán** - Tích hợp VNPay, thẻ tín dụng, ví điện tử
8. **Xác nhận** - Nhận mã đặt vé

### 🌐 Đa ngôn ngữ
- Hỗ trợ Tiếng Việt (mặc định)
- Hỗ trợ Tiếng Anh
- Chuyển đổi ngôn ngữ mượt mà

### 👤 Quản lý tài khoản
- Đăng nhập / Đăng ký
- Quản lý hồ sơ cá nhân
- Xem lịch sử chuyến đi (My Trips)

### 💬 Hỗ trợ khách hàng
- Trang hỗ trợ với Live Chat
- FAQ - Câu hỏi thường gặp
- Trang liên hệ
- Blog du lịch với AI Assistant

## 🛠️ Công nghệ sử dụng

### Frontend
| Công nghệ | Mô tả |
|-----------|-------|
| HTML5 | Cấu trúc trang web |
| CSS3 | Thiết kế giao diện, responsive |
| JavaScript (ES6+) | Xử lý logic, tương tác người dùng |
| Font Awesome | Icons |

### Backend
| Công nghệ | Mô tả |
|-----------|-------|
| Python 3.x | Ngôn ngữ lập trình |
| Flask | Web framework |
| VNPay SDK | Tích hợp thanh toán |

## 📁 Cấu trúc dự án

```
Website-SkyPlan/
├── 📂 backend/
│   ├── app.py                 # Flask application chính
│   ├── config.py              # Cấu hình (VNPay, etc.)
│   ├── requirements.txt       # Python dependencies
│   ├── 📂 db/
│   │   ├── schema.sql         # Database schema
│   │   └── seed.py            # Seed data
│   ├── 📂 models/
│   │   └── db.py              # Database models
│   └── 📂 routes/
│       ├── auth.py            # Authentication routes
│       ├── bookings.py        # Booking routes
│       ├── flights.py         # Flight routes
│       ├── payment.py         # Payment routes (VNPay)
│       └── tickets.py         # Ticket routes
│
├── 📂 frontend/
│   ├── index.html             # Trang chủ
│   ├── search.html            # Trang tìm kiếm
│   ├── fare.html              # Chọn giá vé
│   ├── seat.html              # Chọn ghế
│   ├── passenger.html         # Thông tin hành khách
│   ├── extras.html            # Dịch vụ thêm
│   ├── payment.html           # Thanh toán
│   ├── confirmation.html      # Xác nhận đặt vé
│   ├── overview.html          # Tổng quan chuyến đi
│   ├── my_trips.html          # Quản lý chuyến đi
│   ├── login.html             # Đăng nhập
│   ├── register.html          # Đăng ký
│   ├── profile.html           # Hồ sơ cá nhân
│   ├── support.html           # Hỗ trợ khách hàng
│   ├── contact.html           # Liên hệ
│   ├── faq.html               # Câu hỏi thường gặp
│   ├── blog.html              # Blog du lịch
│   ├── promotion.html         # Khuyến mãi
│   ├── 404.html               # Trang lỗi
│   │
│   ├── 📂 assets/
│   │   ├── 📂 images/         # Hình ảnh
│   │   ├── 📂 scripts/        # JavaScript files
│   │   │   ├── common.js      # Shared functions
│   │   │   ├── config.js      # Frontend config
│   │   │   ├── toast.js       # Notifications
│   │   │   ├── loader.js      # Loading animation
│   │   │   └── *_translations.js  # i18n files
│   │   └── 📂 styles/         # CSS files
│   │       ├── reset.css      # CSS reset
│   │       ├── index.css      # Main styles
│   │       ├── header.css     # Header styles
│   │       ├── footer.css     # Footer styles
│   │       └── *.css          # Page-specific styles
│   │
│   └── 📂 components/
│       ├── header.html        # Header component
│       ├── footer.html        # Footer component
│       └── loader.html        # Loader component
│
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

