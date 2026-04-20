const mongoose = require("mongoose");

const PhongBanSchema = new mongoose.Schema(
  {
    MaPhongBan: { type: String, required: true, unique: true, trim: true },
    TenPhongBan: { type: String, required: true, trim: true },
    DiaChi: { type: String, default: "" },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("PhongBan", PhongBanSchema);
