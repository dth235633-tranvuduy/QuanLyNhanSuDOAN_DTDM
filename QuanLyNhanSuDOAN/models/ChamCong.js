const mongoose = require("mongoose");

const ChamCongSchema = new mongoose.Schema(
  {
    MaChamCong: { type: String, required: true, unique: true, trim: true },
    MaNhanVien: { type: String, required: true, ref: "NhanVien", trim: true },
    NgayCong: { type: Date, required: true },
    TrangThai_ChamCong: { type: String, default: "" },
    ViDo: { type: Number, default: null },
    KinhDo: { type: Number, default: null },
    DiaDiemCheckIn: { type: String, default: "" },
    KhoangCachMet: { type: Number, default: null },
    ThoiDiemCheckIn: { type: Date, default: null },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("ChamCong", ChamCongSchema);
