const express = require("express");
const TaiKhoan = require("../models/TaiKhoan");
const NhanVien = require("../models/NhanVien");

const router = express.Router();

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isLockedAccount(status = "") {
  const normalized = normalizeText(status);
  return normalized === "khoa" || normalized === "locked";
}

function detectRole(tenDangNhap) {
  if (tenDangNhap.toLowerCase() === "admin") {
    return "admin";
  }
  return "nhanvien";
}

router.get("/login", (req, res) => {
  if (req.session?.user?.role === "admin") {
    return res.redirect("/admin/dashboard");
  }
  if (req.session?.user?.role === "nhanvien") {
    return res.redirect("/user");
  }

  return res.render("login", {
    title: "Đăng nhập hệ thống",
    errorMessage: "",
  });
});

router.post("/login", async (req, res) => {
  const tenDangNhap = (req.body.TenDangNhap || "").trim();
  const normalizedTenDangNhap = tenDangNhap.toLowerCase();
  const matKhau = String(req.body.MatKhau || "");

  if (!tenDangNhap || !matKhau) {
    return res.status(400).render("login", {
      title: "Đăng nhập hệ thống",
      errorMessage: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
    });
  }

  const account = await TaiKhoan.findOne({
    TenDangNhap: { $regex: `^${normalizedTenDangNhap}$`, $options: "i" },
  });

  if (!account) {
    return res.status(401).render("login", {
      title: "Đăng nhập hệ thống",
      errorMessage: "Tên đăng nhập hoặc mật khẩu không đúng.",
    });
  }

  if (isLockedAccount(account.TrangThai_TaiKhoan)) {
    return res.status(403).render("login", {
      title: "Đăng nhập hệ thống",
      errorMessage: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
    });
  }

  const isPasswordValid = await account.verifyPassword(matKhau);
  if (!isPasswordValid) {
    return res.status(401).render("login", {
      title: "Đăng nhập hệ thống",
      errorMessage: "Tên đăng nhập hoặc mật khẩu không đúng.",
    });
  }

  if (account.isLegacyPassword()) {
    account.MatKhau = matKhau;
    await account.save();
  }

  const role = detectRole(account.TenDangNhap);

  let maNhanVien = "";
  let hoTen = "Admin";

  if (role === "nhanvien") {
    maNhanVien = account.TenDangNhap.toUpperCase();
    const employee = await NhanVien.findOne({ MaNhanVien: maNhanVien }).lean();

    if (!employee) {
      return res.status(403).render("login", {
        title: "Đăng nhập hệ thống",
        errorMessage: "Tài khoản chưa liên kết hồ sơ nhân viên.",
      });
    }

    hoTen = employee.HoTen;
  }

  req.session.user = {
    tenDangNhap: account.TenDangNhap,
    role,
    maNhanVien,
    hoTen,
  };

  if (role === "admin") {
    return res.redirect("/admin/dashboard");
  }

  return res.redirect("/user");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("qlns.sid");
    res.redirect("/login");
  });
});

module.exports = router;
