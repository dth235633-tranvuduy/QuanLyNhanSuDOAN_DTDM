<<<<<<< HEAD

# SevenTime HRMS - Hệ thống quản lý nhân sự



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

| Vai trò       | Tên đăng nhập       | Mật khẩu |
| ------------- | ------------------- | -------- |
| Quản trị viên | `admin`             | `123456` |
| Nhân viên     | `nv001` đến `nv006` | `123456` |

Tài khoản `nv005` được tạo ở trạng thái khóa để kiểm thử chức năng khóa tài khoản. Hãy đổi mật khẩu mẫu trước khi sử dụng trong môi trường thực tế.

## Các đường dẫn chính

| Đường dẫn            | Mô tả                                           |
| -------------------- | ----------------------------------------------- |
| `/`                  | Trang giới thiệu hệ thống                       |
| `/login`             | Đăng nhập                                       |
| `/admin`             | Khu vực quản trị viên                           |
| `/user`              | Khu vực nhân viên                               |
| `/api/nhanvien`      | API quản lý nhân viên                           |
| `/api/chamcong`      | API quản lý chấm công                           |
| `/api/hopdong`       | API quản lý hợp đồng                            |
| `/api/luongnhanvien` | API quản lý lương                               |
| `/api/me`            | API dữ liệu cá nhân của người dùng đã đăng nhập |

Các API quản trị yêu cầu đăng nhập với quyền `admin`. API `/api/me` dành cho `admin` hoặc `nhanvien` và các trang `/user` chỉ dành cho nhân viên.

## Kiểm thử

# Chạy các bài kiểm thử:

<div align="center">

  <img src="public/assets/logo-hrms.svg" alt="SevenTime HRMS" width="96">

# SevenTime HRMS

**Hệ thống quản lý nhân sự hiện đại, trực quan và an toàn**

  <p>
    Ứng dụng web hỗ trợ quản lý nhân viên, phòng ban, chức vụ, chấm công,
    hợp đồng, lương và quy trình xin nghỉ phép trên một nền tảng thống nhất.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js 20+">
    <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5">
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB Atlas">
    <img src="https://img.shields.io/badge/EJS-5-B4CA65?logo=ejs&logoColor=white" alt="EJS 5">
    <img src="https://img.shields.io/badge/License-ISC-blue" alt="ISC License">
  </p>

</div>

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt và chạy local](#cài-đặt-và-chạy-local)
- [Tệp dung lượng lớn](#tệp-dung-lượng-lớn)
- [Tài khoản demo](#tài-khoản-demo)
- [Kiểm thử](#kiểm-thử)
- [Quy trình Git](#quy-trình-git)

## Giới thiệu

**SevenTime HRMS** là đồ án quản lý nhân sự được xây dựng theo mô hình
server-rendered kết hợp REST API. Hệ thống phân quyền theo hai vai trò:

- **Admin:** quản lý dữ liệu nhân sự, tài khoản, danh mục và theo dõi hoạt động.
- **Nhân viên:** xem hồ sơ cá nhân, chấm công, hợp đồng, lương và gửi đơn nghỉ phép.

Ứng dụng sử dụng MongoDB Atlas để lưu trữ dữ liệu và hỗ trợ tải ảnh hồ sơ
nhân viên thông qua giao diện quản trị.

## Tính năng

- Đăng nhập, đăng xuất và quản lý phiên làm việc.
- Phân quyền Admin/Nhân viên cho giao diện và API.
- Quản lý nhân viên, phòng ban, chức vụ và trình độ.
- Quản lý hợp đồng, chấm công, kỳ công và lương.
- Nhân viên tự xem/cập nhật hồ sơ và đổi mật khẩu.
- Gửi, duyệt và từ chối đơn xin nghỉ phép.
- Thông báo nội bộ và nhật ký hoạt động.
- Upload ảnh nhân viên với tên tệp an toàn.
- API REST và giao diện EJS responsive.
- Dữ liệu mẫu phục vụ trình diễn và phát triển local.

## Công nghệ

| Nhóm           | Công nghệ                      |
| -------------- | ------------------------------ |
| Runtime        | Node.js                        |
| Backend        | Express 5                      |
| Database       | MongoDB Atlas, Mongoose        |
| Template       | EJS                            |
| Authentication | express-session, bcryptjs      |
| Upload         | Multer                         |
| Testing        | Node.js Test Runner, Supertest |
| Development    | Nodemon                        |

## Cấu trúc dự án

```text
QuanLyNhanSuDOAN/
├── index.js                 # Điểm khởi động ứng dụng
├── package.json              # Scripts và dependencies
├── models/                   # Mongoose models
├── routes/                   # REST API routes
├── routers/                  # Router cho giao diện web
├── middlewares/              # Authentication, authorization, logging
├── modules/                  # Logic dùng chung
├── views/                    # EJS templates
├── public/                   # CSS, assets và dữ liệu upload
├── scripts/                  # Script tạo dữ liệu mẫu
└── tests/                    # Automated tests
```

## Cài đặt và chạy local

### Yêu cầu

- Node.js 20 LTS trở lên.
- MongoDB Atlas hoặc MongoDB local.
- Git.

### 1. Clone và cài dependencies

```bash
git clone <URL_REPOSITORY>
cd QuanLyNhanSuDOAN
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
SESSION_SECRET=thay-bang-chuoi-bi-mat-dai-va-ngau-nhien
```

> Không commit file `.env`. Hãy dùng `.env.example` nếu cần chia sẻ mẫu cấu hình
> với các thành viên trong nhóm.

### 3. Tạo dữ liệu mẫu (không bắt buộc)

```bash
npm run seed:sample
```

### 4. Khởi chạy ứng dụng

```bash
# Development - tự khởi động lại khi có thay đổi
npm run dev

# Production/local thông thường
npm start
```

Mở [http://localhost:5000](http://localhost:5000) trên trình duyệt.

## Tệp dung lượng lớn

Để repository nhẹ và tránh vượt giới hạn upload của Git, các tệp lớn như
database dump, video demo, file nén, ảnh gốc và bộ dữ liệu **không được commit
trực tiếp vào Git**.

### Kho lưu trữ ngoài GitNode

Đặt các tệp lớn trong GitNode/kho lưu trữ được nhóm thống nhất, sau đó cập nhật
bảng bên dưới bằng liên kết chia sẻ thực tế:

| Tệp                   | Mục đích                   | Liên kết tải                  |
| --------------------- | -------------------------- | ----------------------------- |
| Database mẫu / backup | Khôi phục dữ liệu demo     | `<DÁN_LINK_GITNODE_DATABASE>` |
| Bộ ảnh upload         | Dữ liệu minh họa giao diện | `<DÁN_LINK_GITNODE_ASSETS>`   |
| Video hướng dẫn       | Demo chức năng             | `<DÁN_LINK_GITNODE_VIDEO>`    |

Sau khi tải về, giải nén/copy tệp vào đúng thư mục theo hướng dẫn của nhóm.
Không đưa thông tin đăng nhập, API key hoặc dữ liệu cá nhân thật vào kho chia sẻ.

> Nếu cần theo dõi phiên bản các tệp lớn ngay trong Git, có thể dùng Git LFS.
> Tuy nhiên, hãy thống nhất quota và quyền truy cập trước khi bật cho cả nhóm.

## Tài khoản demo

Các tài khoản dưới đây được tạo bởi `npm run seed:sample`:

| Vai trò   | Tên đăng nhập | Mật khẩu |
| --------- | ------------- | -------- |
| Admin     | `admin`       | `123456` |
| Nhân viên | `nv001`       | `123456` |

> Đây chỉ là thông tin phục vụ demo local. Không sử dụng các mật khẩu này ở môi
> trường staging hoặc production.

## Kiểm thử

Chạy toàn bộ test:

> > > > > > > baf5ff2fd62a7e18945b319a934e4aa20689d7e2

```bash
npm test
```

<<<<<<< HEAD

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
- # Nên cấu hình MongoDB với tài khoản riêng và giới hạn IP truy cập.

## Quy trình Git

```bash
git pull
git checkout -b feature/ten-tinh-nang

# Sau khi hoàn thành và kiểm thử
git add .
git commit -m "feat: mo-ta-thay-doi"
git push -u origin feature/ten-tinh-nang
```

Khuyến nghị tạo Pull Request để review trước khi merge vào nhánh chính.

## Đóng góp

1. Tạo branch cho từng tính năng hoặc bug fix.
2. Giữ thay đổi tập trung, không commit `node_modules`, `.env` hoặc tệp lớn.
3. Chạy `npm test` trước khi tạo Pull Request.
4. Mô tả rõ mục đích, thay đổi chính và cách kiểm thử.

## Bản quyền

Dự án được phát hành theo giấy phép **ISC**.

> > > > > > > baf5ff2fd62a7e18945b319a934e4aa20689d7e2
