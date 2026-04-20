const mongoose = require("mongoose");

const KyChamCongThangSchema = new mongoose.Schema(
  {
    Thang: { type: Number, required: true, min: 1, max: 12 },
    Nam: { type: Number, required: true, min: 2000 },
    TrangThaiKy: {
      type: String,
      enum: ["Mở", "Khóa"],
      default: "Mở",
    },
    MoLuc: { type: Date, default: Date.now },
    KhoaLuc: { type: Date, default: null },
  },
  {
    versionKey: false,
  },
);

KyChamCongThangSchema.index({ Nam: 1, Thang: 1 }, { unique: true });

module.exports = mongoose.model("KyChamCongThang", KyChamCongThangSchema);
