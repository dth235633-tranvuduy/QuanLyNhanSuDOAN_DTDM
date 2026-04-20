const mongoose = require("mongoose");

const DonXinNghiSchema = new mongoose.Schema(
  {
    MaDonNghi: { type: String, required: true, unique: true, trim: true },
    MaNhanVien: { type: String, required: true, ref: "NhanVien", trim: true },
    TuNgay: { type: Date, required: true },
    DenNgay: { type: Date, required: true },
    LoaiNghi: {
      type: String,
      enum: ["Nghi phep", "Nghi om", "Nghi khong luong", "Khac"],
      default: "Nghi phep",
    },
    LyDo: { type: String, default: "" },
    TrangThaiDon: {
      type: String,
      enum: ["Cho duyet", "Da duyet", "Tu choi"],
      default: "Cho duyet",
    },
    PhanHoiAdmin: { type: String, default: "" },
    NgayTao: { type: Date, default: Date.now },
    NgayCapNhat: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

DonXinNghiSchema.pre("save", function updateTimestamp() {
  this.NgayCapNhat = new Date();
});

module.exports = mongoose.model("DonXinNghi", DonXinNghiSchema);
