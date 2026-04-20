const mongoose = require("mongoose");

const NhanVienSchema = new mongoose.Schema(
  {
    MaNhanVien: { type: String, required: true, unique: true, trim: true },
    HinhAnh: { type: String, default: "" },
    HoTen: { type: String, required: true, trim: true },
    NgaySinh: { type: Date },
    GioiTinh: { type: String, default: "" },
    CCCD: { type: String, default: "", trim: true },
    Email: { type: String, default: "", trim: true },
    SoDienThoai: { type: String, default: "", trim: true },
    DiaChi: { type: String, default: "" },
    NgayVaoLam: { type: Date },
    TrangThai_NhanVien: { type: String, default: "" },
    MaPhongBan: { type: String, ref: "PhongBan", trim: true },
    MaChucVu: { type: String, ref: "ChucVu", trim: true },
    MaTrinhDo: { type: String, ref: "TrinhDo", trim: true },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("NhanVien", NhanVienSchema);
