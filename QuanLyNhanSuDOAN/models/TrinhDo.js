const mongoose = require("mongoose");

const TrinhDoSchema = new mongoose.Schema(
  {
    MaTrinhDo: { type: String, required: true, unique: true, trim: true },
    TenTrinhDo: { type: String, required: true, trim: true },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("TrinhDo", TrinhDoSchema);
