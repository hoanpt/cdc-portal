# CDC Portal v2 — Hệ thống Tiếp nhận & Cấp Giấy Chứng Nhận Tiêm Chủng

## Mô tả
Hệ thống quản lý hồ sơ tiếp nhận và cấp giấy chứng nhận tiêm chủng theo cơ chế 1 cửa, phục vụ CDC Đà Nẵng.

## Yêu cầu hệ thống
- Node.js >= 20
- npm >= 9

## Khởi chạy

```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo file cấu hình môi trường
cp .env.example .env.local
# → Mở .env.local và điền giá trị thật (xem hướng dẫn bên dưới)

# 3. Chạy môi trường dev
npm run dev
# → http://localhost:3002
```

## Cấu hình (.env.local)
Tham khảo file [`.env.example`](.env.example) để cấu hình:

| Biến | Mô tả |
|------|-------|
| `GOOGLE_DRIVE_KEY_FILE` | Đường dẫn tới file JSON Service Account |
| `GOOGLE_DRIVE_FOLDER_ID` | ID thư mục Google Drive lưu hồ sơ |
| `SMTP_HOST / USER / PASS` | Cấu hình SMTP gửi email tự động |
| `JWT_SECRET` | Chuỗi bí mật ký JWT — **thay bằng chuỗi ngẫu nhiên mạnh** |
| `NEXT_PUBLIC_APP_URL` | URL công khai của hệ thống |

> ⚠️ **Không commit `.env.local` lên Git!** File này đã được thêm vào `.gitignore`.

## Tài khoản mặc định
- **Tên đăng nhập**: `admin`
- **Mật khẩu**: `123456`
- ⚠️ **Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!** (Admin → Tài khoản → Đổi mật khẩu)

## Cấu trúc thư mục
```
cdc-portal-v2/
├── app/
│   ├── page.js              # Trang chủ công dân
│   ├── submit/              # Nộp hồ sơ trực tuyến
│   ├── track/               # Tra cứu hồ sơ
│   ├── admin/               # Cổng quản trị
│   │   ├── page.js          # Đăng nhập
│   │   ├── dashboard/       # Dashboard + danh sách hồ sơ
│   │   ├── cases/[id]/      # Chi tiết + xử lý hồ sơ
│   │   ├── settings/        # Cấu hình SMTP & VietQR
│   │   └── accounts/        # Quản lý tài khoản
│   └── api/                 # API Routes (Next.js Route Handlers)
│       ├── auth/login|logout # Đăng nhập / Đăng xuất
│       ├── applications/     # CRUD hồ sơ
│       ├── track/[id]        # Tra cứu public
│       ├── stats/            # Thống kê dashboard
│       ├── backup/           # Backup database
│       ├── accounts/         # Quản lý tài khoản
│       ├── settings/         # Cấu hình hệ thống
│       ├── config/           # Cấu hình thanh toán (public)
│       └── drive/[fileId]    # Proxy download file từ Drive
├── lib/
│   ├── db.js                # SQLite — khởi tạo DB và schema
│   ├── drive.js             # Google Drive integration
│   ├── email.js             # Nodemailer — gửi email thông báo
│   ├── backup.js            # Backup tự động mỗi 24h
│   ├── auth.js              # JWT authentication helpers
│   └── paymentConfig.js     # Cấu hình VietQR mặc định
├── components/
│   └── PublicHeader.js      # Header dùng chung trang công dân
├── public/
│   ├── brand/               # ← Đặt logo CDC tại đây (logo.png)
│   └── uploads/             # File upload của người dân (tự tạo, không commit)
├── data/                    # Database & backups (tự tạo, không commit)
│   ├── cdc_portal.db
│   └── backups/
└── config/                  # Google Drive key (tự tạo, không commit)
    └── google-drive-key.json
```

## Tích hợp Google Drive
1. Vào https://console.cloud.google.com
2. Tạo Project → Enable **Google Drive API**
3. Tạo **Service Account** → Tải JSON key → Lưu vào `config/google-drive-key.json`
4. Tạo thư mục trên Google Drive → Share với email Service Account (quyền **Editor**)
5. Copy Folder ID → Điền vào `GOOGLE_DRIVE_FOLDER_ID` trong `.env.local`

> 💡 Google Drive là tuỳ chọn. Nếu chưa cấu hình, file sẽ chỉ lưu local tại `public/uploads/`.

## Cấu hình Email (SMTP)
- Dùng Gmail: bật **2FA** → Tạo [App Password](https://myaccount.google.com/apppasswords) → Điền vào `SMTP_PASS`
- Hoặc cấu hình trực tiếp trong giao diện Admin → **Cấu hình hệ thống**

## Thêm logo CDC
Đặt file logo vào `public/brand/`:
- `logo.png` — Logo chính (khuyến nghị nền trắng, tỷ lệ 4:1)

## Backup dữ liệu
- **Tự động**: Mỗi 24h (backup đầu tiên sau 5 phút kể từ khi server khởi động)
- **Thủ công**: Nút **Backup DB** trên Admin Dashboard
- Backup lưu tại `data/backups/` và upload lên Google Drive (nếu đã cấu hình)
- Tự động xóa backup cũ hơn 30 ngày (có thể đổi qua `BACKUP_KEEP_DAYS`)

## Bảo mật
- JWT httpOnly cookie, expire 8h
- Mật khẩu hash bằng bcrypt (cost 10)
- Thông tin CCCD/SĐT bị mask khi tra cứu public
- SMTP password bị obscure trong API settings
- Phân quyền `admin` / `staff` rõ ràng
