const mongoose = require("mongoose");

const HopDongSchema = new mongoose.Schema(
  {
    MaHopDong: { type: String, required: true, unique: true, trim: true },
    MaNhanVien: { type: String, required: true, ref: "NhanVien", trim: true },
    LoaiHopDong: { type: String, default: "" },
    TrangThai_HopDong: { type: String, default: "" },
    NgayBatDau: { type: Date },
    NgayKetThuc: { type: Date },
    MucLuong: { type: Number, default: 0 },
    PhuCapCoDinh: { type: Number, default: 0 },
    HeSoLuong: { type: Number, default: 1 },
    SoGioCong: { type: Number, default: 0 },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("HopDong", HopDongSchema);
