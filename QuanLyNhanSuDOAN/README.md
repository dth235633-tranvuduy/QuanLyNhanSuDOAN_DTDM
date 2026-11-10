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

| Nhóm | Công nghệ |
| --- | --- |
| Runtime | Node.js |
| Backend | Express 5 |
| Database | MongoDB Atlas, Mongoose |
| Template | EJS |
| Authentication | express-session, bcryptjs |
| Upload | Multer |
| Testing | Node.js Test Runner, Supertest |
| Development | Nodemon |

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

| Tệp | Mục đích | Liên kết tải |
| --- | --- | --- |
| Database mẫu / backup | Khôi phục dữ liệu demo | `<DÁN_LINK_GITNODE_DATABASE>` |
| Bộ ảnh upload | Dữ liệu minh họa giao diện | `<DÁN_LINK_GITNODE_ASSETS>` |
| Video hướng dẫn | Demo chức năng | `<DÁN_LINK_GITNODE_VIDEO>` |

Sau khi tải về, giải nén/copy tệp vào đúng thư mục theo hướng dẫn của nhóm.
Không đưa thông tin đăng nhập, API key hoặc dữ liệu cá nhân thật vào kho chia sẻ.

> Nếu cần theo dõi phiên bản các tệp lớn ngay trong Git, có thể dùng Git LFS.
> Tuy nhiên, hãy thống nhất quota và quyền truy cập trước khi bật cho cả nhóm.

## Tài khoản demo

Các tài khoản dưới đây được tạo bởi `npm run seed:sample`:

| Vai trò | Tên đăng nhập | Mật khẩu |
| --- | --- | --- |
| Admin | `admin` | `123456` |
| Nhân viên | `nv001` | `123456` |

> Đây chỉ là thông tin phục vụ demo local. Không sử dụng các mật khẩu này ở môi
> trường staging hoặc production.

## Kiểm thử

Chạy toàn bộ test:

```bash
npm test
```

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
