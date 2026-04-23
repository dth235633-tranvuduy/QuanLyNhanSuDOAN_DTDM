const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const TaiKhoan = require("../models/TaiKhoan");
const TrinhDo = require("../models/TrinhDo");
const PhongBan = require("../models/PhongBan");
const ChucVu = require("../models/ChucVu");
const NhanVien = require("../models/NhanVien");
const ChamCong = require("../models/ChamCong");
const HopDong = require("../models/HopDong");
const LuongNhanVien = require("../models/LuongNhanVien");

const trinhDoData = [
  { MaTrinhDo: "TD01", TenTrinhDo: "Cao dang" },
  { MaTrinhDo: "TD02", TenTrinhDo: "Dai hoc" },
  { MaTrinhDo: "TD03", TenTrinhDo: "Thac si" },
  { MaTrinhDo: "TD04", TenTrinhDo: "Tien si" },
];

const phongBanData = [
  {
    MaPhongBan: "PB01",
    TenPhongBan: "Nhan su",
    DiaChi: "Tang 3 - Tru so chinh",
  },
  {
    MaPhongBan: "PB02",
    TenPhongBan: "Ke toan",
    DiaChi: "Tang 2 - Tru so chinh",
  },
  {
    MaPhongBan: "PB03",
    TenPhongBan: "Tai chinh",
    DiaChi: "Tang 4 - Tru so chinh",
  },
  {
    MaPhongBan: "PB04",
    TenPhongBan: "Cong nghe thong tin",
    DiaChi: "Tang 5 - Tru so chinh",
  },
  {
    MaPhongBan: "PB05",
    TenPhongBan: "Kinh doanh",
    DiaChi: "Tang 6 - Tru so chinh",
  },
];

const chucVuData = [
  { MaChucVu: "CV01", TenChucVu: "Nhan vien" },
  { MaChucVu: "CV02", TenChucVu: "Truong nhom" },
  { MaChucVu: "CV03", TenChucVu: "Truong phong" },
  { MaChucVu: "CV04", TenChucVu: "Pho giam doc" },
];

const nhanVienData = [
  {
    MaNhanVien: "NV001",
    HinhAnh: "https://i.pravatar.cc/150?img=1",
    HoTen: "Phan Thanh Hoai",
    NgaySinh: new Date("1998-04-12"),
    GioiTinh: "Nam",
    CCCD: "079098001111",
    Email: "hoai.pt@seventime.vn",
    SoDienThoai: "035663827",
    DiaChi:
      "Dai hoc An Giang, 18 Ung Van Khiem, Dong Xuyen, Long Xuyen, An Giang",
    NgayVaoLam: new Date("2023-01-10"),
    TrangThai_NhanVien: "Dang lam viec",
    MaPhongBan: "PB01",
    MaChucVu: "CV03",
    MaTrinhDo: "TD03",
  },
  {
    MaNhanVien: "NV002",
    HinhAnh: "https://i.pravatar.cc/150?img=2",
    HoTen: "Nguyen Minh Thu",
    NgaySinh: new Date("1997-09-23"),
    GioiTinh: "Nu",
    CCCD: "079097002222",
    Email: "thu.nm@seventime.vn",
    SoDienThoai: "0901122334",
    DiaChi: "Cao Lanh, Dong Thap",
    NgayVaoLam: new Date("2022-06-01"),
    TrangThai_NhanVien: "Dang lam viec",
    MaPhongBan: "PB02",
    MaChucVu: "CV02",
    MaTrinhDo: "TD02",
  },
  {
    MaNhanVien: "NV003",
    HinhAnh: "https://i.pravatar.cc/150?img=3",
    HoTen: "Tran Quoc Dat",
    NgaySinh: new Date("1996-12-05"),
    GioiTinh: "Nam",
    CCCD: "079096003333",
    Email: "dat.tq@seventime.vn",
    SoDienThoai: "0914455667",
    DiaChi: "Can Tho",
    NgayVaoLam: new Date("2021-03-15"),
    TrangThai_NhanVien: "Dang lam viec",
    MaPhongBan: "PB04",
    MaChucVu: "CV02",
    MaTrinhDo: "TD02",
  },
  {
    MaNhanVien: "NV004",
    HinhAnh: "https://i.pravatar.cc/150?img=4",
    HoTen: "Le Thi Nhu Y",
    NgaySinh: new Date("1999-07-18"),
    GioiTinh: "Nu",
    CCCD: "079099004444",
    Email: "y.ltn@seventime.vn",
    SoDienThoai: "0937788990",
    DiaChi: "Chau Doc, An Giang",
    NgayVaoLam: new Date("2024-01-08"),
    TrangThai_NhanVien: "Dang lam viec",
    MaPhongBan: "PB05",
    MaChucVu: "CV01",
    MaTrinhDo: "TD01",
  },
  {
    MaNhanVien: "NV005",
    HinhAnh: "https://i.pravatar.cc/150?img=5",
    HoTen: "Pham Ngoc Ha",
    NgaySinh: new Date("1995-11-11"),
    GioiTinh: "Nu",
    CCCD: "079095005555",
    Email: "ha.pn@seventime.vn",
    SoDienThoai: "0977001122",
    DiaChi: "Rach Gia, Kien Giang",
    NgayVaoLam: new Date("2020-09-20"),
    TrangThai_NhanVien: "Tam nghi",
    MaPhongBan: "PB03",
    MaChucVu: "CV03",
    MaTrinhDo: "TD03",
  },
  {
    MaNhanVien: "NV006",
    HinhAnh: "https://i.pravatar.cc/150?img=6",
    HoTen: "Vo Hoang Long",
    NgaySinh: new Date("2000-02-14"),
    GioiTinh: "Nam",
    CCCD: "079100006666",
    Email: "long.vh@seventime.vn",
    SoDienThoai: "0988899777",
    DiaChi: "Vung Tau",
    NgayVaoLam: new Date("2024-05-02"),
    TrangThai_NhanVien: "Dang lam viec",
    MaPhongBan: "PB04",
    MaChucVu: "CV01",
    MaTrinhDo: "TD02",
  },
];

const taiKhoanData = [
  { TenDangNhap: "admin", MatKhau: "123456", TrangThai_TaiKhoan: "Hoạt động" },
  { TenDangNhap: "nv001", MatKhau: "123456", TrangThai_TaiKhoan: "Hoạt động" },
  { TenDangNhap: "nv002", MatKhau: "123456", TrangThai_TaiKhoan: "Hoạt động" },
  { TenDangNhap: "nv003", MatKhau: "123456", TrangThai_TaiKhoan: "Hoạt động" },
  { TenDangNhap: "nv004", MatKhau: "123456", TrangThai_TaiKhoan: "Hoạt động" },
  { TenDangNhap: "nv005", MatKhau: "123456", TrangThai_TaiKhoan: "Khóa" },
  { TenDangNhap: "nv006", MatKhau: "123456", TrangThai_TaiKhoan: "Hoạt động" },
];

const chamCongData = [
  {
    MaChamCong: "CC001",
    MaNhanVien: "NV001",
    NgayCong: new Date("2026-04-14"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC002",
    MaNhanVien: "NV001",
    NgayCong: new Date("2026-04-15"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC003",
    MaNhanVien: "NV002",
    NgayCong: new Date("2026-04-14"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC004",
    MaNhanVien: "NV003",
    NgayCong: new Date("2026-04-14"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC005",
    MaNhanVien: "NV004",
    NgayCong: new Date("2026-04-14"),
    TrangThai_ChamCong: "Nghi phep",
  },
  {
    MaChamCong: "CC006",
    MaNhanVien: "NV006",
    NgayCong: new Date("2026-04-15"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC007",
    MaNhanVien: "NV002",
    NgayCong: new Date("2026-04-16"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC008",
    MaNhanVien: "NV003",
    NgayCong: new Date("2026-04-16"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC009",
    MaNhanVien: "NV001",
    NgayCong: new Date("2026-04-16"),
    TrangThai_ChamCong: "Di lam",
  },
  {
    MaChamCong: "CC010",
    MaNhanVien: "NV006",
    NgayCong: new Date("2026-04-16"),
    TrangThai_ChamCong: "Di lam",
  },
];

const hopDongData = [
  {
    MaHopDong: "HD001",
    MaNhanVien: "NV001",
    LoaiHopDong: "Khong xac dinh thoi han",
    TrangThai_HopDong: "Con hieu luc",
    NgayBatDau: new Date("2023-01-10"),
    NgayKetThuc: null,
    MucLuong: 18000000,
    PhuCapCoDinh: 2500000,
    HeSoLuong: 1.5,
    SoGioCong: 176,
  },
  {
    MaHopDong: "HD002",
    MaNhanVien: "NV002",
    LoaiHopDong: "12 thang",
    TrangThai_HopDong: "Con hieu luc",
    NgayBatDau: new Date("2025-01-01"),
    NgayKetThuc: new Date("2026-12-31"),
    MucLuong: 15000000,
    PhuCapCoDinh: 2000000,
    HeSoLuong: 1.3,
    SoGioCong: 176,
  },
  {
    MaHopDong: "HD003",
    MaNhanVien: "NV003",
    LoaiHopDong: "Khong xac dinh thoi han",
    TrangThai_HopDong: "Con hieu luc",
    NgayBatDau: new Date("2021-03-15"),
    NgayKetThuc: null,
    MucLuong: 17000000,
    PhuCapCoDinh: 2200000,
    HeSoLuong: 1.4,
    SoGioCong: 176,
  },
  {
    MaHopDong: "HD004",
    MaNhanVien: "NV004",
    LoaiHopDong: "Thu viec",
    TrangThai_HopDong: "Con hieu luc",
    NgayBatDau: new Date("2026-01-01"),
    NgayKetThuc: new Date("2026-06-30"),
    MucLuong: 9000000,
    PhuCapCoDinh: 800000,
    HeSoLuong: 1,
    SoGioCong: 176,
  },
  {
    MaHopDong: "HD005",
    MaNhanVien: "NV005",
    LoaiHopDong: "Khong xac dinh thoi han",
    TrangThai_HopDong: "Tam dung",
    NgayBatDau: new Date("2020-09-20"),
    NgayKetThuc: null,
    MucLuong: 19000000,
    PhuCapCoDinh: 3000000,
    HeSoLuong: 1.6,
    SoGioCong: 176,
  },
  {
    MaHopDong: "HD006",
    MaNhanVien: "NV006",
    LoaiHopDong: "24 thang",
    TrangThai_HopDong: "Con hieu luc",
    NgayBatDau: new Date("2024-05-02"),
    NgayKetThuc: new Date("2026-05-01"),
    MucLuong: 12000000,
    PhuCapCoDinh: 1500000,
    HeSoLuong: 1.2,
    SoGioCong: 176,
  },
];

const luongNhanVienData = [
  {
    MaBangLuong: "BL001",
    MaNhanVien: "NV001",
    Thang: 3,
    Nam: 2026,
    SoNgayCong: 24,
    Thuong: 2000000,
    KhauTru: 500000,
  },
  {
    MaBangLuong: "BL002",
    MaNhanVien: "NV002",
    Thang: 3,
    Nam: 2026,
    SoNgayCong: 24,
    Thuong: 1500000,
    KhauTru: 300000,
  },
  {
    MaBangLuong: "BL003",
    MaNhanVien: "NV003",
    Thang: 3,
    Nam: 2026,
    SoNgayCong: 25,
    Thuong: 1800000,
    KhauTru: 450000,
  },
  {
    MaBangLuong: "BL004",
    MaNhanVien: "NV004",
    Thang: 3,
    Nam: 2026,
    SoNgayCong: 22,
    Thuong: 800000,
    KhauTru: 200000,
  },
  {
    MaBangLuong: "BL005",
    MaNhanVien: "NV005",
    Thang: 3,
    Nam: 2026,
    SoNgayCong: 12,
    Thuong: 200000,
    KhauTru: 100000,
  },
  {
    MaBangLuong: "BL006",
    MaNhanVien: "NV006",
    Thang: 3,
    Nam: 2026,
    SoNgayCong: 24,
    Thuong: 1200000,
    KhauTru: 350000,
  },
  {
    MaBangLuong: "BL007",
    MaNhanVien: "NV001",
    Thang: 4,
    Nam: 2026,
    SoNgayCong: 16,
    Thuong: 1000000,
    KhauTru: 250000,
  },
  {
    MaBangLuong: "BL008",
    MaNhanVien: "NV002",
    Thang: 4,
    Nam: 2026,
    SoNgayCong: 16,
    Thuong: 900000,
    KhauTru: 200000,
  },
];

async function upsertMany(Model, data, uniqueKey) {
  const operations = data.map((item) => ({
    updateOne: {
      filter: { [uniqueKey]: item[uniqueKey] },
      update: { $set: item },
      upsert: true,
    },
  }));

  if (!operations.length) return;
  await Model.bulkWrite(operations);
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("Thieu MONGO_URI trong file .env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Da ket noi MongoDB");

  await upsertMany(TrinhDo, trinhDoData, "MaTrinhDo");
  await upsertMany(PhongBan, phongBanData, "MaPhongBan");
  await upsertMany(ChucVu, chucVuData, "MaChucVu");
  await upsertMany(NhanVien, nhanVienData, "MaNhanVien");
  const hashedTaiKhoanData = await Promise.all(
    taiKhoanData.map(async (account) => ({
      ...account,
      MatKhau: await bcrypt.hash(String(account.MatKhau || ""), 10),
    })),
  );
  await upsertMany(TaiKhoan, hashedTaiKhoanData, "TenDangNhap");
  await upsertMany(ChamCong, chamCongData, "MaChamCong");
  await upsertMany(HopDong, hopDongData, "MaHopDong");
  await upsertMany(LuongNhanVien, luongNhanVienData, "MaBangLuong");

  console.log("Seed du lieu mau thanh cong cho 8 bang.");
}

run()
  .catch((error) => {
    console.error("Seed that bai:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
