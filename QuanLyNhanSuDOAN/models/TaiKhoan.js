const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

function isBcryptHash(value = "") {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value || ""));
}

function normalizeStatus(value = "") {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized === "khoa" || normalized === "locked") {
    return "Khóa";
  }
  return "Hoạt động";
}

async function hashPasswordIfNeeded(value = "") {
  const plainText = String(value || "");
  if (!plainText || isBcryptHash(plainText)) {
    return plainText;
  }
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

async function normalizePasswordUpdate(update = {}) {
  const directHasPassword = Object.prototype.hasOwnProperty.call(
    update,
    "MatKhau",
  );
  const setHasPassword =
    update.$set && Object.prototype.hasOwnProperty.call(update.$set, "MatKhau");

  if (directHasPassword) {
    const value = String(update.MatKhau || "").trim();
    if (!value) {
      delete update.MatKhau;
    } else {
      update.MatKhau = await hashPasswordIfNeeded(value);
    }
  }

  if (setHasPassword) {
    const value = String(update.$set.MatKhau || "").trim();
    if (!value) {
      delete update.$set.MatKhau;
    } else {
      update.$set.MatKhau = await hashPasswordIfNeeded(value);
    }
  }

  if (Object.prototype.hasOwnProperty.call(update, "TrangThai_TaiKhoan")) {
    update.TrangThai_TaiKhoan = normalizeStatus(update.TrangThai_TaiKhoan);
  }

  if (
    update.$set &&
    Object.prototype.hasOwnProperty.call(update.$set, "TrangThai_TaiKhoan")
  ) {
    update.$set.TrangThai_TaiKhoan = normalizeStatus(
      update.$set.TrangThai_TaiKhoan,
    );
  }
}

const TaiKhoanSchema = new mongoose.Schema(
  {
    TenDangNhap: { type: String, required: true, unique: true, trim: true },
    MatKhau: { type: String, required: true },
    TrangThai_TaiKhoan: {
      type: String,
      enum: ["Hoạt động", "Khóa"],
      default: "Hoạt động",
    },
  },
  {
    versionKey: false,
  },
);

TaiKhoanSchema.pre("validate", function onValidate() {
  this.TrangThai_TaiKhoan = normalizeStatus(this.TrangThai_TaiKhoan);
});

TaiKhoanSchema.methods.verifyPassword = async function verifyPassword(
  plainPassword = "",
) {
  const input = String(plainPassword || "");
  const stored = String(this.MatKhau || "");
  if (!input || !stored) return false;

  if (isBcryptHash(stored)) {
    return bcrypt.compare(input, stored);
  }

  return stored === input;
};

TaiKhoanSchema.methods.isLegacyPassword = function isLegacyPassword() {
  return !isBcryptHash(this.MatKhau);
};

TaiKhoanSchema.pre("save", async function onSave() {
  if (this.isModified("MatKhau")) {
    this.MatKhau = await hashPasswordIfNeeded(this.MatKhau);
  }

  this.TrangThai_TaiKhoan = normalizeStatus(this.TrangThai_TaiKhoan);
});

TaiKhoanSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  async function onUpdate() {
    const update = this.getUpdate() || {};
    await normalizePasswordUpdate(update);
    this.setUpdate(update);
  },
);

module.exports = mongoose.model("TaiKhoan", TaiKhoanSchema);
