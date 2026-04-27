# Thiết lập Render từ đầu

Tài liệu này hướng dẫn tạo lại SkyPlan trên Render với mô hình **Web Service + PostgreSQL Managed**.

## 1) Tạo cơ sở dữ liệu PostgreSQL

1. Trên Render, chọn **New** → **PostgreSQL**.
2. Đặt tên, ví dụ: `skyplan-db`.
3. Chọn cùng region với Web Service.
4. Có thể dùng gói free nếu phù hợp.
5. Sau khi tạo xong, copy **Internal Database URL**.

## 2) Tạo Web Service

1. Trên Render, chọn **New** → **Web Service**.
2. Kết nối repo GitHub `Website-SkyPlan`.
3. Cấu hình:
   - **Root Directory**: để trống nếu repo root là `Website-SkyPlan`
   - **Runtime**: Python 3
   - **Branch**: `fix/deploy`
4. Dùng các lệnh sau:

```bash
Build Command: pip install --upgrade pip && pip install -r backend/requirements.txt
Start Command: gunicorn --config backend/gunicorn_config.py --bind 0.0.0.0:$PORT wsgi:app
```

## 3) Thêm biến môi trường

Thiết lập các biến sau trong Web Service:

- `DATABASE_URL` = chuỗi kết nối nội bộ của PostgreSQL trên Render
- `SECRET_KEY` = một chuỗi ngẫu nhiên đủ dài
- `RENDER` = `true`
- `BOOTSTRAP_DB_ON_STARTUP` = `true`
- `SQL_ECHO` = `false` (tuỳ chọn)

Nếu dùng tính năng blockchain, cấu hình thêm:

- `SEPOLIA_RPC_URL`
- `BOOKING_REGISTRY_ADDRESS`
- `TICKET_NFT_ADDRESS`
- `SKY_TOKEN_ADDRESS`
- `PRIVATE_KEY` hoặc `CONTRACT_PRIVATE_KEY`

## 4) Deploy

1. Lưu service.
2. Chọn **Manual Deploy** → **Deploy latest commit**.
3. Theo dõi log đến khi thấy:
   - `[DB] Tables ensured.`
   - `[DB Bootstrap] Running backend.db.create_tables...`
   - `[DB Bootstrap] Running backend.db.import_flights...`
   - `[DB Bootstrap] Running backend.db.create_all_seats...`
   - `[DB Bootstrap] Completed successfully.`

## 5) Kiểm tra dữ liệu

Sau khi deploy xong, mở:

```text
https://<your-render-service>.onrender.com/api/flights
```

Nếu service trả `503` trong thời gian ngắn, chờ bootstrap hoàn tất rồi tải lại trang.

## 6) Các lỗi thường gặp

- Không để trống `DATABASE_URL`.
- Không dùng SQLite trên Render; ứng dụng này yêu cầu PostgreSQL.
- Giữ Web Service và PostgreSQL cùng region.
- Nếu không thấy log bootstrap, kiểm tra deploy có đang dùng branch `fix/deploy` không.
