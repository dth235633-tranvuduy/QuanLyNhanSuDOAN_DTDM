const NhatKyHoatDong = require("../models/NhatKyHoatDong");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractEntityFromPath(pathname = "") {
  const path = String(pathname || "");
  const adminMatch = path.match(/^\/admin\/([^/]+)/i);
  if (adminMatch) return adminMatch[1].toLowerCase();

  const apiMatch = path.match(/^\/api\/([^/]+)/i);
  if (apiMatch) return apiMatch[1].toLowerCase();

  if (/\/cham-cong\//i.test(path)) return "chamcong";
  if (/\/login$/i.test(path) || /\/logout$/i.test(path)) return "taikhoan";

  return "khac";
}

function detectAction(req, pathname) {
  const method = String(req.method || "").toUpperCase();
  const path = String(pathname || "");

  if (method === "POST" && /\/user\/cham-cong\/xac-nhan$/i.test(path)) {
    return "Chấm công";
  }

  if (method === "POST" && /\/login$/i.test(path)) {
    return "Đăng nhập";
  }

  if (method === "POST" && /\/logout$/i.test(path)) {
    return "Đăng xuất";
  }

  if (method === "DELETE" || /\/delete$/i.test(path)) {
    return "Xóa dữ liệu";
  }

  if (method === "PUT" || method === "PATCH" || /\/edit$/i.test(path)) {
    return "Cập nhật dữ liệu";
  }

  if (method === "POST") {
    return "Tạo mới dữ liệu";
  }

  return "Thao tác dữ liệu";
}

function inferTargetCode(req) {
  const source = {
    ...req.params,
    ...req.body,
  };

  const candidateKeys = [
    "MaNhanVien",
    "MaChamCong",
    "MaBangLuong",
    "MaHopDong",
    "MaPhongBan",
    "MaChucVu",
    "MaTrinhDo",
    "TenDangNhap",
    "key",
  ];

  for (const key of candidateKeys) {
    const value = source[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      const first = String(value[0] || "").trim();
      if (first) return first;
      continue;
    }

    const text = String(value || "").trim();
    if (text) return text;
  }

  return "";
}

function buildDescription(action, actorLabel, targetCode, pathname) {
  const targetLabel = targetCode ? ` [${targetCode}]` : "";
  return `${actorLabel} - ${action}${targetLabel} tại ${pathname}`;
}

function attachActivityLogger(req, res, next) {
  const method = String(req.method || "").toUpperCase();
  if (!MUTATING_METHODS.has(method)) {
    next();
    return;
  }

  const startedAt = Date.now();
  const userSnapshot = req.session?.user
    ? {
        tenDangNhap: req.session.user.tenDangNhap,
        role: req.session.user.role,
        maNhanVien: req.session.user.maNhanVien,
        hoTen: req.session.user.hoTen,
      }
    : null;

  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    const pathname = String(req.originalUrl || "").split("?")[0] || "/";
    const entity = extractEntityFromPath(pathname);
    const user = req.session?.user || userSnapshot || {};

    const tenDangNhap = String(user.tenDangNhap || "Khach").trim();
    const role = String(user.role || "guest").trim();
    const maNhanVien = String(user.maNhanVien || "").trim();
    const hoTen = String(
      user.hoTen || (role === "admin" ? "Admin" : ""),
    ).trim();

    const action = detectAction(req, pathname);
    const targetCode = inferTargetCode(req);
    const actorLabel = hoTen || tenDangNhap || "Không rõ";
    const duration = Math.max(0, Date.now() - startedAt);
    const ip = String(
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
    )
      .split(",")[0]
      .trim();
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 250);

    const payload = {
      HanhDong: action,
      MoTa: buildDescription(action, actorLabel, targetCode, pathname),
      TenDangNhap: tenDangNhap,
      VaiTro: role,
      MaNhanVien: maNhanVien,
      HoTen: hoTen,
      DoiTuong: entity,
      MaDoiTuong: targetCode,
      DuongDan: pathname,
      PhuongThuc: method,
      TrangThaiHTTP: res.statusCode,
      DiaChiIP: ip,
      UserAgent: userAgent,
      ThoiLuongMs: duration,
      ThoiGian: new Date(),
    };

    NhatKyHoatDong.create(payload).catch(() => {});
  });

  next();
}

module.exports = {
  attachActivityLogger,
};
