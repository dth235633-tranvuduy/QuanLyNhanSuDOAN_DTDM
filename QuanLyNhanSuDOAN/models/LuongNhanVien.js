const mongoose = require("mongoose");

const LuongNhanVienSchema = new mongoose.Schema(
  {
    MaBangLuong: { type: String, required: true, unique: true, trim: true },
    MaNhanVien: { type: String, required: true, ref: "NhanVien", trim: true },
    Thang: { type: Number, required: true, min: 1, max: 12 },
    Nam: { type: Number, required: true },
    SoNgayCong: { type: Number, default: 0 },
    TongGioCong: { type: Number, default: 0 },
    TongGioOT: { type: Number, default: 0 },
    SuDungDuLieuCongTay: { type: Boolean, default: false },
    Thuong: { type: Number, default: 0 },
    KhauTru: { type: Number, default: 0 },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("LuongNhanVien", LuongNhanVienSchema);
