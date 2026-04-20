const mongoose = require("mongoose");

const ChucVuSchema = new mongoose.Schema(
  {
    MaChucVu: { type: String, required: true, unique: true, trim: true },
    TenChucVu: { type: String, required: true, trim: true },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("ChucVu", ChucVuSchema);
