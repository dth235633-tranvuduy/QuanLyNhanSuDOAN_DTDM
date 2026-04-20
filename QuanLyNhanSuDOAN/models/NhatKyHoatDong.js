const mongoose = require("mongoose");

const NhatKyHoatDongSchema = new mongoose.Schema(
  {
    HanhDong: { type: String, required: true, trim: true },
    MoTa: { type: String, default: "", trim: true },
    TenDangNhap: { type: String, default: "", trim: true },
    VaiTro: { type: String, default: "", trim: true },
    MaNhanVien: { type: String, default: "", trim: true },
    HoTen: { type: String, default: "", trim: true },
    DoiTuong: { type: String, default: "", trim: true },
    MaDoiTuong: { type: String, default: "", trim: true },
    DuongDan: { type: String, default: "", trim: true },
    PhuongThuc: { type: String, default: "", trim: true },
    TrangThaiHTTP: { type: Number, default: 200 },
    DiaChiIP: { type: String, default: "", trim: true },
    UserAgent: { type: String, default: "", trim: true },
    ThoiLuongMs: { type: Number, default: 0 },
    ThoiGian: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

NhatKyHoatDongSchema.index({ ThoiGian: -1 });
NhatKyHoatDongSchema.index({ MaNhanVien: 1, ThoiGian: -1 });
NhatKyHoatDongSchema.index({ HanhDong: 1, ThoiGian: -1 });

module.exports = mongoose.model("NhatKyHoatDong", NhatKyHoatDongSchema);
