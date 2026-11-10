# SevenTime HRMS - Hệ thống quản lý nhân sự

<p align="center">
  <img src="public/assets/logo-hrms.svg" alt="SevenTime HRMS" width="100">
</p>

<p align="center">
  <strong>Hệ thống quản lý nhân sự cho doanh nghiệp</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-CommonJS-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-5.2.1-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9.4.1-47A248?logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/EJS-5.0.2-B4CA65?logo=ejs&logoColor=black" alt="EJS">
  <img src="https://img.shields.io/badge/License-ISC-blue" alt="License ISC">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/bcryptjs-3.0.3-7A1FA2" alt="bcryptjs">
  <img src="https://img.shields.io/badge/Multer-2.1.1-F7DF1E?logo=javascript&logoColor=black" alt="Multer">
  <img src="https://img.shields.io/badge/Supertest-7.1.1-43853D?logo=node.js&logoColor=white" alt="Supertest">
  <img src="https://img.shields.io/badge/Nodemon-3.1.14-76D04B?logo=nodemon&logoColor=white" alt="Nodemon">
</p>

SevenTime HRMS là ứng dụng web hỗ trợ quản lý nhân sự cho doanh nghiệp. Hệ thống cung cấp khu vực quản trị dành cho quản trị viên và khu vực cá nhân dành cho nhân viên, sử dụng MongoDB để lưu trữ dữ liệu.

## Chức năng chính

### Quản trị viên

- Đăng nhập và phân quyền quản trị.
- Quản lý nhân viên, tài khoản, phòng ban, chức vụ và trình độ.
- Quản lý hợp đồng lao động, chấm công và bảng lương.
- Tìm kiếm, lọc và quản lý hồ sơ nhân viên.
- Tải ảnh hồ sơ nhân viên.
- Nhập và xuất danh sách nhân viên bằng CSV.
- Theo dõi, mở hoặc khóa kỳ chấm công.
- Duyệt hoặc từ chối đơn xin nghỉ phép.
- Quản lý hệ số lương, thông báo nội bộ và nhật ký hoạt động.

### Nhân viên

- Xem và cập nhật hồ sơ cá nhân, ảnh đại diện và mật khẩu.
- Xem hợp đồng, lịch sử chấm công và bảng lương.
- Chấm công trong khoảng thời gian quy định tại vị trí văn phòng.
- Gửi và theo dõi đơn xin nghỉ phép.
- Xem thông báo nội bộ.

## Công nghệ sử dụng

- **Runtime:** Node.js (CommonJS)
- **Backend:** Express `5.2.1`, CORS `2.8.6`, dotenv `17.4.2`
- **Giao diện:** EJS `5.0.2`, HTML, CSS
- **Cơ sở dữ liệu:** MongoDB, Mongoose `9.4.1`
- **Xác thực và phiên đăng nhập:** express-session `1.19.0`, bcryptjs `3.0.3`
- **Tải tệp:** Multer `2.1.1`
- **Kiểm thử:** Node.js Test Runner, Supertest `7.1.1`
- **Phát triển:** Nodemon `3.1.14`

## Yêu cầu môi trường

- Node.js 18 trở lên
- npm
- MongoDB hoặc MongoDB Atlas

## Cài đặt và chạy dự án

1. Mở terminal tại thư mục dự án:

   ```bash
   cd QuanLyNhanSuDOAN
   ```

2. Cài đặt dependency:

   ```bash
   npm install
   ```

3. Tạo tệp `.env` tại thư mục gốc của dự án:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/quanlynhansu
   SESSION_SECRET=thay-bang-chuoi-bi-mat
   PORT=5000
   ```

   `NEWS_API_URL` là biến tùy chọn nếu muốn cấu hình nguồn tin bên ngoài. Không đưa tệp `.env` hoặc thông tin kết nối thật lên Git.

4. Khởi tạo dữ liệu mẫu:

   ```bash
   npm run seed:sample
   ```

5. Khởi động ứng dụng:

   ```bash
   npm start
   ```

   Khi phát triển, có thể dùng:

   ```bash
   npm run dev
   ```

6. Truy cập [http://localhost:5000](http://localhost:5000). Trang đăng nhập nằm tại [http://localhost:5000/login](http://localhost:5000/login).

## Tài khoản dữ liệu mẫu

Sau khi chạy `npm run seed:sample`, có thể đăng nhập bằng:

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin` | `123456` |
| Nhân viên | `nv001` đến `nv006` | `123456` |

Tài khoản `nv005` được tạo ở trạng thái khóa để kiểm thử chức năng khóa tài khoản. Hãy đổi mật khẩu mẫu trước khi sử dụng trong môi trường thực tế.

## Các đường dẫn chính

| Đường dẫn | Mô tả |
|---|---|
| `/` | Trang giới thiệu hệ thống |
| `/login` | Đăng nhập |
| `/admin` | Khu vực quản trị viên |
| `/user` | Khu vực nhân viên |
| `/api/nhanvien` | API quản lý nhân viên |
| `/api/chamcong` | API quản lý chấm công |
| `/api/hopdong` | API quản lý hợp đồng |
| `/api/luongnhanvien` | API quản lý lương |
| `/api/me` | API dữ liệu cá nhân của người dùng đã đăng nhập |

Các API quản trị yêu cầu đăng nhập với quyền `admin`. API `/api/me` dành cho `admin` hoặc `nhanvien` và các trang `/user` chỉ dành cho nhân viên.

## Kiểm thử

Chạy các bài kiểm thử:

```bash
npm test
```

## Cấu trúc thư mục

```text
QuanLyNhanSuDOAN/
├── index.js                 # Khởi tạo Express và kết nối MongoDB
├── models/                  # Mongoose models
├── routes/                  # Các API CRUD
├── routers/                 # Router giao diện admin, user và auth
├── middlewares/             # Xác thực, phân quyền và nhật ký hoạt động
├── modules/                 # Logic nghiệp vụ dùng chung
├── views/                   # Giao diện EJS
├── public/                  # CSS, tài nguyên và ảnh tải lên
├── scripts/                 # Script tạo dữ liệu mẫu
└── tests/                   # Bài kiểm thử
```

## Lưu ý bảo mật

- Sử dụng `SESSION_SECRET` đủ dài và ngẫu nhiên.
- Không sử dụng mật khẩu mẫu trong môi trường production.
- Không commit `.env`, chuỗi kết nối MongoDB hoặc dữ liệu nhân sự thật.
- Nên cấu hình MongoDB với tài khoản riêng và giới hạn IP truy cập.
