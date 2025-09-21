# Hướng dẫn đóng góp (CONTRIBUTING.md)

## 1. Quy tắc branch

### main
- Code ổn định, đã test → dùng để deploy.
- 🚫 Không push trực tiếp.

### dev
- Nhánh phát triển chung.
- Tất cả feature đều merge vào đây trước khi lên `main`.

### feature/
- Nhánh tính năng cụ thể, tạo từ `dev`.
- Ví dụ:
  - `feature/frontend-search`
  - `feature/frontend-auth`
  - `feature/backend-flights`
  - `feature/backend-bookings`

### hotfix/
- Nhánh fix gấp cho `main`.
- Ví dụ: `hotfix/fix-cancel-api`.

---

## 2. Quy trình làm việc

### Update `dev` trước khi tạo nhánh mới
```bash
git checkout dev
git pull origin dev
git checkout -b feature/<ten-tinh-nang>
```

### Commit rõ ràng, ngắn gọn
- Dùng tiếng Anh hoặc tiếng Việt nhất quán.
- Cấu trúc:
  ```
  <scope>: <mô tả thay đổi>
  ```
- Ví dụ:
  - `frontend: build search.html with API call`
  - `backend: add /bookings/hold endpoint`

### Push và mở Pull Request
```bash
git push -u origin feature/<ten-tinh-nang>
```
- Vào GitHub → tạo PR từ `feature/...` → `dev`.
- Gắn label hoặc tag reviewer.

### Review & Merge
- Ít nhất 1 review approve trước khi merge vào `dev`.
- Khi `dev` ổn định (đã test đầy đủ) → maintainer merge `dev` → `main`.

---

## 3. Coding convention

### Frontend (HTML/CSS/JS)
- Tên class: `kebab-case` (`.search-form`, `.btn-primary`).
- JS: dùng `camelCase` cho biến/hàm.
- CSS:
  - Gom style chung vào `assets/styles/`.
  - Component riêng thì tách file nếu cần.
- Không commit file build (`node_modules/`, `dist/`).

### Backend (Flask + Python)
- Tuân theo PEP8 (4 spaces).
- Tách `route` → `controller` → `service` rõ ràng.
- DB:
  - Migration/seed nằm trong `backend/db/`.
- Không commit file `.env`, chỉ commit `.env.example`.

---

## 4. Pull Request checklist

Trước khi merge PR:
- [ ] Đã chạy code và test cơ bản.
- [ ] Không còn file rác (`.env`, `*.db`, `__pycache__`).
- [ ] Cập nhật doc nếu có thay đổi API hoặc flow.
- [ ] Commit message rõ ràng.

---

## 5. Ghi chú
- Luôn chạy `git pull origin dev` trước khi code để tránh conflict.
- Nếu gặp conflict khi merge → tự xử lý và báo lại reviewer.
- Nếu lỡ commit `.env` hoặc file bí mật → xoá và rotate key ngay.