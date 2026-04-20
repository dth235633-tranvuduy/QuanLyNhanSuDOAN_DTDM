const mongoose = require("mongoose");

const ThongBaoNoiBoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    source: { type: String, default: "Thông báo nội bộ", trim: true },
    category: {
      type: String,
      enum: ["Noi bo", "Chinh sach", "Dao tao", "Su kien", "Van hanh"],
      default: "Noi bo",
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Thuong", "Quan trong", "Khan cap"],
      default: "Thuong",
      trim: true,
    },
    publishedAt: { type: Date, default: Date.now },
    url: { type: String, default: "#", trim: true },
    createdBy: { type: String, default: "admin", trim: true },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("ThongBaoNoiBo", ThongBaoNoiBoSchema);
