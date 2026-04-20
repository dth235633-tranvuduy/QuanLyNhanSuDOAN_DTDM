const TaiKhoan = require("../models/TaiKhoan");
const TrinhDo = require("../models/TrinhDo");
const PhongBan = require("../models/PhongBan");
const ChucVu = require("../models/ChucVu");
const NhanVien = require("../models/NhanVien");
const ChamCong = require("../models/ChamCong");
const HopDong = require("../models/HopDong");
const DonXinNghi = require("../models/DonXinNghi");
const LuongNhanVien = require("../models/LuongNhanVien");

const entities = {
  nhanvien: {
    label: "Nhân viên",
    menuLabel: "Nhân viên",
    section: "Hồ sơ nhân sự",
    icon: "bi-person-badge",
    model: NhanVien,
    keyField: "MaNhanVien",
  },
  taikhoan: {
    label: "Tài khoản",
    menuLabel: "Tài khoản",
    section: "Tài khoản",
    icon: "bi-person-gear",
    model: TaiKhoan,
    keyField: "TenDangNhap",
  },
  trinhdo: {
    label: "Trình độ",
    menuLabel: "Trình độ học vấn",
    section: "Hồ sơ nhân sự",
    icon: "bi-mortarboard",
    model: TrinhDo,
    keyField: "MaTrinhDo",
  },
  phongban: {
    label: "Phòng ban",
    menuLabel: "Phòng ban",
    section: "Danh mục tổ chức",
    icon: "bi-building",
    model: PhongBan,
    keyField: "MaPhongBan",
  },
  chucvu: {
    label: "Chức vụ",
    menuLabel: "Chức vụ",
    section: "Danh mục tổ chức",
    icon: "bi-briefcase",
    model: ChucVu,
    keyField: "MaChucVu",
  },
  chamcong: {
    label: "Chấm công",
    menuLabel: "Bảng công",
    section: "Chấm công",
    icon: "bi-calendar-check",
    model: ChamCong,
    keyField: "MaChamCong",
  },
  hopdong: {
    label: "Hợp đồng",
    menuLabel: "Hợp đồng",
    section: "Hồ sơ nhân sự",
    icon: "bi-file-earmark-text",
    model: HopDong,
    keyField: "MaHopDong",
  },
  donxinnghi: {
    label: "Đơn xin nghỉ",
    menuLabel: "Đơn xin nghỉ",
    section: "Chấm công",
    icon: "bi-envelope-paper",
    model: DonXinNghi,
    keyField: "MaDonNghi",
  },
  luongnhanvien: {
    label: "Lương nhân viên",
    menuLabel: "Bảng lương",
    section: "Tiền lương",
    icon: "bi-wallet2",
    model: LuongNhanVien,
    keyField: "MaBangLuong",
  },
};

module.exports = entities;
