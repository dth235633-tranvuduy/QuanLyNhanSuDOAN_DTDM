const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const entities = require("../modules/entityRegistry");
const {
  getDailyNewsItems,
  createInternalNewsItem,
} = require("../modules/newsService");
const {
  toFieldMeta,
  normalizePayload,
  formatDate,
} = require("../modules/adminHelpers");
const {
  isAutoCodeField,
  generateNextCode,
} = require("../modules/codeGenerator");
const {
  summarizeAttendanceByMonth,
  pickEffectiveContract,
  calculatePayrollForMonth,
} = require("../modules/salaryCalculator");
const KyChamCongThang = require("../models/KyChamCongThang");
const NhatKyHoatDong = require("../models/NhatKyHoatDong");
const {
  ensureAttendancePeriod,
  ensureCurrentAttendancePeriod,
} = require("../modules/attendancePeriodService");

const router = express.Router();

const EMPLOYEE_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "public",
  "uploads",
  "employees",
);

if (!fs.existsSync(EMPLOYEE_UPLOAD_DIR)) {
  fs.mkdirSync(EMPLOYEE_UPLOAD_DIR, { recursive: true });
}

const employeeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, EMPLOYEE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".jpg";
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `nhanvien-${unique}${safeExt}`);
  },
});

const uploadEmployeeImage = multer({
  storage: employeeStorage,
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const ext = path.extname(String(file.originalname || "")).toLowerCase();
    const allowedExt = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
      ".svg",
      ".heic",
      ".heif",
    ]);

    if (mime.startsWith("image/") || allowedExt.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Chi cho phep tep hinh anh (jpg, png, webp, heic...)"));
  },
});

function buildUploadErrorRedirect(req, message) {
  const encoded = encodeURIComponent(String(message || "Tai anh that bai"));
  if (req.params.entity === "nhanvien" && req.params.key) {
    return `/admin/nhanvien/${req.params.key}/edit?uploadError=${encoded}`;
  }
  return `/admin/nhanvien/new?uploadError=${encoded}`;
}

function parseNhanVienUpload(req, res, next) {
  if (req.params.entity !== "nhanvien") {
    next();
    return;
  }

  uploadEmployeeImage.single("HinhAnhFile")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Anh vuot qua gioi han 12MB"
          : error.message;
      return res.redirect(buildUploadErrorRedirect(req, message));
    }
    next();
  });
}

function getEntity(name) {
  return entities[name] || null;
}

const NHAN_VIEN_CSV_FIELDS = [
  "MaNhanVien",
  "HoTen",
  "NgaySinh",
  "GioiTinh",
  "CCCD",
  "Email",
  "SoDienThoai",
  "DiaChi",
  "NgayVaoLam",
  "TrangThai_NhanVien",
  "MaPhongBan",
  "MaChucVu",
  "MaTrinhDo",
  "HinhAnh",
];

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildNhanVienQuery(querySource = {}) {
  const keywordRaw = String(querySource.keyword || "").trim();
  const maPhongBanRaw = String(querySource.maPhongBan || "").trim();
  const maChucVuRaw = String(querySource.maChucVu || "").trim();

  const query = {};

  if (keywordRaw) {
    const keywordRegex = {
      $regex: escapeRegex(keywordRaw),
      $options: "i",
    };
    query.$or = [
      { MaNhanVien: keywordRegex },
      { HoTen: keywordRegex },
      { Email: keywordRegex },
      { CCCD: keywordRegex },
      { SoDienThoai: keywordRegex },
    ];
  }

  if (maPhongBanRaw) {
    query.MaPhongBan = maPhongBanRaw;
  }

  if (maChucVuRaw) {
    query.MaChucVu = maChucVuRaw;
  }

  return {
    query,
    filters: {
      keyword: keywordRaw,
      maPhongBan: maPhongBanRaw,
      maChucVu: maChucVuRaw,
    },
  };
}

async function getNhanVienReferenceOptions() {
  const [phongBanRows, chucVuRows, trinhDoRows] = await Promise.all([
    entities.phongban.model.find().sort({ MaPhongBan: 1 }).lean(),
    entities.chucvu.model.find().sort({ MaChucVu: 1 }).lean(),
    entities.trinhdo.model.find().sort({ MaTrinhDo: 1 }).lean(),
  ]);

  return {
    MaPhongBan: phongBanRows.map((item) => ({
      value: item.MaPhongBan,
      label: `${item.MaPhongBan} - ${item.TenPhongBan || ""}`.replace(
        /\s+-\s+$/,
        "",
      ),
    })),
    MaChucVu: chucVuRows.map((item) => ({
      value: item.MaChucVu,
      label: `${item.MaChucVu} - ${item.TenChucVu || ""}`.replace(
        /\s+-\s+$/,
        "",
      ),
    })),
    MaTrinhDo: trinhDoRows.map((item) => ({
      value: item.MaTrinhDo,
      label: `${item.MaTrinhDo} - ${item.TenTrinhDo || ""}`.replace(
        /\s+-\s+$/,
        "",
      ),
    })),
  };
}

async function getHopDongReferenceOptions() {
  const nhanVienRows = await entities.nhanvien.model
    .find()
    .sort({ MaNhanVien: 1 })
    .select({ MaNhanVien: 1, HoTen: 1, _id: 0 })
    .lean();

  return {
    MaNhanVien: nhanVienRows.map((item) => ({
      value: item.MaNhanVien,
      label: `${item.MaNhanVien} - ${item.HoTen || "Chưa cập nhật"}`,
    })),
  };
}

function toCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatDateForCsv(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseCsvLine(line = "") {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => String(value || "").trim());
}

function parseDateInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("/").map((x) => Number(x));
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMonthYear(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function parseNonNegativeNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parsePositiveInt(value, fallback, min = 1, max = 200) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isApprovedLeaveStatus(status = "") {
  return /\bda\s*duyet\b|\bapproved\b/.test(normalizeText(status));
}

function isRejectedLeaveStatus(status = "") {
  return /\btu\s*choi\b|\breject(ed)?\b/.test(normalizeText(status));
}

function isFinalizedLeaveStatus(status = "") {
  return isApprovedLeaveStatus(status) || isRejectedLeaveStatus(status);
}

function getDayRange(dateValue) {
  const base = new Date(dateValue);
  base.setHours(0, 0, 0, 0);
  const start = new Date(base);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function buildAttendanceCode(maNhanVien, dateValue) {
  const date = new Date(dateValue);
  const key = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `CC-${maNhanVien}-${key}`;
}

async function applyApprovedLeaveToAttendance(leaveRecord) {
  if (!leaveRecord) return;

  const maNhanVien = String(leaveRecord.MaNhanVien || "").trim();
  const tuNgay = leaveRecord.TuNgay ? new Date(leaveRecord.TuNgay) : null;
  const denNgay = leaveRecord.DenNgay ? new Date(leaveRecord.DenNgay) : null;

  if (!maNhanVien || !tuNgay || !denNgay) return;
  if (Number.isNaN(tuNgay.getTime()) || Number.isNaN(denNgay.getTime())) return;

  tuNgay.setHours(0, 0, 0, 0);
  denNgay.setHours(0, 0, 0, 0);
  if (denNgay < tuNgay) return;

  const loopDate = new Date(tuNgay);
  while (loopDate <= denNgay) {
    const { start, end } = getDayRange(loopDate);
    const existing = await entities.chamcong.model.findOne({
      MaNhanVien: maNhanVien,
      NgayCong: { $gte: start, $lte: end },
    });

    if (existing) {
      const normalizedStatus = normalizeText(existing.TrangThai_ChamCong);
      const isPresent = /di\s*lam|co\s*cong|present/.test(normalizedStatus);
      const hasCheckedIn = Boolean(existing.ThoiDiemCheckIn);

      // Neu nhan vien da check-in thi giu nguyen du lieu di lam.
      if (!isPresent && !hasCheckedIn) {
        existing.TrangThai_ChamCong = "Xin nghi";
        await existing.save();
      }
    } else {
      const maChamCong = buildAttendanceCode(maNhanVien, loopDate);
      await entities.chamcong.model.updateOne(
        { MaChamCong: maChamCong },
        {
          $setOnInsert: {
            MaChamCong: maChamCong,
            MaNhanVien: maNhanVien,
            NgayCong: new Date(start),
            TrangThai_ChamCong: "Xin nghi",
          },
        },
        { upsert: true },
      );
    }

    loopDate.setDate(loopDate.getDate() + 1);
  }
}

function buildPasswordChangeViewModel(status = "", message = "") {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();
  return {
    status: normalizedStatus,
    message: String(message || "").trim(),
    isSuccess: normalizedStatus === "success",
    isError: normalizedStatus === "error",
  };
}

async function getNextBangLuongCodes(count) {
  if (!count) return [];

  const rows = await entities.luongnhanvien.model
    .find({ MaBangLuong: { $regex: /^BL\d+$/i } })
    .select({ MaBangLuong: 1, _id: 0 })
    .lean();

  let maxNumber = 0;
  rows.forEach((item) => {
    const text = String(item.MaBangLuong || "").toUpperCase();
    const parsed = Number.parseInt(text.replace(/^BL/, ""), 10);
    if (Number.isInteger(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  });

  return Array.from({ length: count }, (_x, index) => {
    const number = maxNumber + index + 1;
    return `BL${String(number).padStart(3, "0")}`;
  });
}

function normalizeAttendanceStatus(status = "") {
  const raw = String(status || "").trim();
  const normalized = normalizeText(raw);

  if (/di\s*lam|co\s*cong|present/.test(normalized)) {
    return { label: "Có công", className: "present" };
  }

  if (/xin\s*nghi|leave/.test(normalized)) {
    return { label: "Xin nghỉ", className: "off" };
  }

  if (/nghi\s*phep|vang|nghi|off|absent/.test(normalized)) {
    return { label: "Nghỉ/Vắng", className: "off" };
  }

  return { label: raw || "--", className: "unknown" };
}

function getMonthCalendarDays(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month - 1, day);
    const weekday = weekdays[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      day,
      weekday,
      isWeekend,
      dateLabel: `${day}/${month}/${year}`,
    };
  });
}

function buildMonthlyAttendanceRows(employeeRows, attendanceRows, month, year) {
  const calendarDays = getMonthCalendarDays(month, year);
  const attendanceMap = new Map();

  attendanceRows.forEach((item) => {
    const date = new Date(item.NgayCong);
    if (Number.isNaN(date.getTime())) return;
    const day = date.getDate();
    attendanceMap.set(
      `${item.MaNhanVien}-${day}`,
      item.TrangThai_ChamCong || "",
    );
  });

  const rows = employeeRows.map((employee) => {
    const dayCells = calendarDays.map((dayInfo) => {
      const key = `${employee.MaNhanVien}-${dayInfo.day}`;
      const status = normalizeAttendanceStatus(attendanceMap.get(key));
      return {
        day: dayInfo.day,
        weekday: dayInfo.weekday,
        isWeekend: dayInfo.isWeekend,
        status,
      };
    });

    const totalPresent = dayCells.filter(
      (cell) => cell.status.className === "present",
    ).length;

    return {
      MaNhanVien: employee.MaNhanVien,
      HoTen: employee.HoTen || "",
      TenPhongBan: employee.TenPhongBan || "",
      dayCells,
      totalPresent,
    };
  });

  return {
    calendarDays,
    rows,
  };
}

router.get("/", (req, res) => {
  res.redirect("/admin/dashboard");
});

router.get("/dashboard", async (req, res) => {
  const totalNhanVien = await entities.nhanvien.model.countDocuments();
  const dangLamViec = await entities.nhanvien.model.countDocuments({
    TrangThai_NhanVien: { $regex: /đang làm việc|dang lam viec/i },
  });
  const totalPhongBan = await entities.phongban.model.countDocuments();

  const today = new Date();
  const thang = today.getMonth() + 1;
  const nam = today.getFullYear();
  const luongThangNay = await entities.luongnhanvien.model.countDocuments({
    Thang: thang,
    Nam: nam,
  });

  res.render("dashboard", {
    title: "Bảng điều khiển Admin",
    entities,
    entityName: "",
    stats: {
      totalNhanVien,
      dangLamViec,
      totalPhongBan,
      luongThangNay,
    },
  });
});

router.get("/thongbao", (req, res) => {
  res.render("notifications", {
    title: "Thông báo mới",
    entities,
    entityName: "",
    createStatus: String(req.query.status || "").trim(),
    createMessage: String(req.query.message || "").trim(),
  });
});

router.post("/thongbao", async (req, res) => {
  try {
    await createInternalNewsItem({
      title: req.body.title,
      description: req.body.description,
      source: req.body.source,
      category: req.body.category,
      priority: req.body.priority,
      url: req.body.url,
      createdBy: req.session?.user?.tenDangNhap || req.session?.user?.hoTen,
    });

    return res.redirect(
      "/admin/thongbao?status=success&message=Da+them+thong+bao+moi",
    );
  } catch (error) {
    return res.redirect(
      `/admin/thongbao?status=error&message=${encodeURIComponent(error.message || "Khong+the+them+thong+bao")}`,
    );
  }
});

router.get("/doimatkhau", (req, res) => {
  res.render("change-password", {
    title: "Đổi mật khẩu hệ thống",
    entities,
    entityName: "",
    flash: buildPasswordChangeViewModel(req.query.status, req.query.message),
  });
});

router.post("/doimatkhau", async (req, res) => {
  const tenDangNhap = String(req.session?.user?.tenDangNhap || "").trim();
  if (!tenDangNhap) {
    return res.redirect(
      "/admin/doimatkhau?status=error&message=Khong+xac+dinh+duoc+tai+khoan+admin",
    );
  }

  const matKhauCu = String(req.body.matKhauCu || "").trim();
  const matKhauMoi = String(req.body.matKhauMoi || "").trim();
  const xacNhanMatKhauMoi = String(req.body.xacNhanMatKhauMoi || "").trim();

  if (!matKhauCu || !matKhauMoi || !xacNhanMatKhauMoi) {
    return res.redirect(
      "/admin/doimatkhau?status=error&message=Vui+long+nhap+day+du+mat+khau+cu%2C+mat+khau+moi+va+xac+nhan",
    );
  }

  if (matKhauCu === matKhauMoi) {
    return res.redirect(
      "/admin/doimatkhau?status=error&message=Mat+khau+moi+khong+duoc+trung+mat+khau+hien+tai",
    );
  }

  if (matKhauMoi !== xacNhanMatKhauMoi) {
    return res.redirect(
      "/admin/doimatkhau?status=error&message=Xac+nhan+mat+khau+moi+khong+khop",
    );
  }

  const account = await entities.taikhoan.model.findOne({
    TenDangNhap: { $regex: `^${escapeRegex(tenDangNhap)}$`, $options: "i" },
  });

  if (!account) {
    return res.redirect(
      "/admin/doimatkhau?status=error&message=Khong+tim+thay+tai+khoan+admin",
    );
  }

  const isCurrentPasswordValid = await account.verifyPassword(matKhauCu);
  if (!isCurrentPasswordValid) {
    return res.redirect(
      "/admin/doimatkhau?status=error&message=Mat+khau+cu+khong+dung",
    );
  }

  account.MatKhau = matKhauMoi;
  await account.save();

  return res.redirect(
    "/admin/doimatkhau?status=success&message=Doi+mat+khau+thanh+cong",
  );
});

router.get("/lich-su-hoat-dong", async (req, res) => {
  const keyword = String(req.query.keyword || "").trim();
  const action = String(req.query.action || "").trim();
  const maNhanVien = String(req.query.maNhanVien || "").trim();
  const fromDateRaw = String(req.query.fromDate || "").trim();
  const toDateRaw = String(req.query.toDate || "").trim();

  const page = parsePositiveInt(req.query.page, 1, 1, 100000);
  const limit = parsePositiveInt(req.query.limit, 20, 5, 100);
  const skip = (page - 1) * limit;

  const query = {};

  if (action) {
    query.HanhDong = action;
  }

  if (maNhanVien) {
    query.MaNhanVien = {
      $regex: `^${escapeRegex(maNhanVien)}$`,
      $options: "i",
    };
  }

  if (keyword) {
    const keywordRegex = {
      $regex: escapeRegex(keyword),
      $options: "i",
    };
    query.$or = [
      { HoTen: keywordRegex },
      { TenDangNhap: keywordRegex },
      { MaNhanVien: keywordRegex },
      { DoiTuong: keywordRegex },
      { MaDoiTuong: keywordRegex },
      { MoTa: keywordRegex },
      { DuongDan: keywordRegex },
    ];
  }

  const fromDate = parseDateInput(fromDateRaw);
  const toDate = parseDateInput(toDateRaw);
  if (fromDate || toDate) {
    query.ThoiGian = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      query.ThoiGian.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.ThoiGian.$lte = to;
    }
  }

  const [totalItems, rows, actionOptions, employeeOptionsRaw] =
    await Promise.all([
      NhatKyHoatDong.countDocuments(query),
      NhatKyHoatDong.find(query)
        .sort({ ThoiGian: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NhatKyHoatDong.distinct("HanhDong"),
      NhatKyHoatDong.aggregate([
        {
          $match: {
            MaNhanVien: { $exists: true, $ne: "" },
          },
        },
        { $sort: { ThoiGian: -1 } },
        {
          $group: {
            _id: "$MaNhanVien",
            HoTen: { $first: "$HoTen" },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 300 },
      ]),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);

  res.render("activity-log", {
    title: "Lịch sử hoạt động hệ thống",
    entities,
    entityName: "",
    rows,
    filters: {
      keyword,
      action,
      maNhanVien,
      fromDate: fromDateRaw,
      toDate: toDateRaw,
      limit,
    },
    pagination: {
      page: currentPage,
      limit,
      totalItems,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      prevPage: Math.max(1, currentPage - 1),
      nextPage: Math.min(totalPages, currentPage + 1),
    },
    actionOptions: actionOptions
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "vi")),
    employeeOptions: employeeOptionsRaw.map((item) => ({
      maNhanVien: item._id,
      hoTen: item.HoTen || "",
    })),
  });
});

router.get("/bang-cong", async (req, res) => {
  await ensureCurrentAttendancePeriod();

  const now = new Date();
  const selectedThang = parseMonthYear(
    req.query.thang,
    1,
    12,
    now.getMonth() + 1,
  );
  const selectedNam = parseMonthYear(
    req.query.nam,
    2000,
    3000,
    now.getFullYear(),
  );

  await ensureAttendancePeriod(selectedThang, selectedNam);

  const periodRows = await KyChamCongThang.find()
    .sort({ Nam: -1, Thang: -1 })
    .lean();

  const monthOptions = periodRows.map((item) => ({
    thang: item.Thang,
    nam: item.Nam,
    trangThaiKy: item.TrangThaiKy,
  }));

  monthOptions.sort((a, b) => {
    if (a.nam !== b.nam) return b.nam - a.nam;
    return b.thang - a.thang;
  });

  const selectedRange = {
    $gte: new Date(selectedNam, selectedThang - 1, 1),
    $lt: new Date(selectedNam, selectedThang, 1),
  };

  const selectedRows = await entities.chamcong.model
    .find({ NgayCong: selectedRange })
    .lean();
  const employeeCount = new Set(
    selectedRows.map((x) => x.MaNhanVien).filter(Boolean),
  ).size;

  const monthSummaries = monthOptions.map((item) => ({
    ...item,
    isSelected: item.thang === selectedThang && item.nam === selectedNam,
    isOpen: item.trangThaiKy === "Mở",
  }));

  res.render("attendance-months", {
    title: "Bảng công theo tháng",
    entities,
    monthSummaries,
    selectedThang,
    selectedNam,
    employeeCount,
  });
});

router.post("/bang-cong/:nam/:thang/toggle", async (req, res) => {
  const nam = parseMonthYear(
    req.params.nam,
    2000,
    3000,
    new Date().getFullYear(),
  );
  const thang = parseMonthYear(
    req.params.thang,
    1,
    12,
    new Date().getMonth() + 1,
  );

  const period = await ensureAttendancePeriod(thang, nam);
  const nextStatus = period.TrangThaiKy === "Mở" ? "Khóa" : "Mở";

  await KyChamCongThang.findOneAndUpdate(
    { Nam: nam, Thang: thang },
    {
      TrangThaiKy: nextStatus,
      KhoaLuc: nextStatus === "Khóa" ? new Date() : null,
      MoLuc: nextStatus === "Mở" ? new Date() : period.MoLuc,
    },
    { runValidators: true },
  );

  res.redirect(`/admin/bang-cong?thang=${thang}&nam=${nam}`);
});

router.post("/bang-cong/:nam/:thang/cap-nhat-luong-cong", async (req, res) => {
  const nam = parseMonthYear(
    req.params.nam,
    2000,
    3000,
    new Date().getFullYear(),
  );
  const thang = parseMonthYear(
    req.params.thang,
    1,
    12,
    new Date().getMonth() + 1,
  );

  const maNhanVienList = toArray(req.body.maNhanVien).map((x) =>
    String(x || "").trim(),
  );
  const soNgayCongList = toArray(req.body.soNgayCong);
  const tongGioCongList = toArray(req.body.tongGioCong);
  const tongGioOTList = toArray(req.body.tongGioOT);

  const inputRows = maNhanVienList
    .map((maNhanVien, index) => ({
      maNhanVien,
      soNgayCong: parseNonNegativeNumber(soNgayCongList[index], 0),
      tongGioCong: parseNonNegativeNumber(tongGioCongList[index], 0),
      tongGioOT: parseNonNegativeNumber(tongGioOTList[index], 0),
    }))
    .filter((row) => row.maNhanVien);

  if (!inputRows.length) {
    return res.redirect(`/admin/bang-cong/${nam}/${thang}`);
  }

  const existingRows = await entities.luongnhanvien.model
    .find({
      Nam: nam,
      Thang: thang,
      MaNhanVien: { $in: inputRows.map((x) => x.maNhanVien) },
    })
    .lean();

  const existingMap = Object.fromEntries(
    existingRows.map((row) => [row.MaNhanVien, row]),
  );

  const missingRows = inputRows.filter((row) => !existingMap[row.maNhanVien]);
  const generatedCodes = await getNextBangLuongCodes(missingRows.length);
  let insertCodeIndex = 0;

  for (const row of inputRows) {
    const payload = {
      SoNgayCong: row.soNgayCong,
      TongGioCong: row.tongGioCong,
      TongGioOT: row.tongGioOT,
      SuDungDuLieuCongTay: true,
    };

    const existing = existingMap[row.maNhanVien];
    if (existing) {
      await entities.luongnhanvien.model.findOneAndUpdate(
        { MaBangLuong: existing.MaBangLuong },
        payload,
        { runValidators: true },
      );
      continue;
    }

    await entities.luongnhanvien.model.create({
      MaBangLuong: generatedCodes[insertCodeIndex],
      MaNhanVien: row.maNhanVien,
      Thang: thang,
      Nam: nam,
      SoNgayCong: row.soNgayCong,
      TongGioCong: row.tongGioCong,
      TongGioOT: row.tongGioOT,
      SuDungDuLieuCongTay: true,
      Thuong: 0,
      KhauTru: 0,
    });
    insertCodeIndex += 1;
  }

  res.redirect(`/admin/bang-cong/${nam}/${thang}`);
});

router.get("/bang-cong/:nam/:thang", async (req, res) => {
  const nam = parseMonthYear(
    req.params.nam,
    2000,
    3000,
    new Date().getFullYear(),
  );
  const thang = parseMonthYear(
    req.params.thang,
    1,
    12,
    new Date().getMonth() + 1,
  );

  const range = {
    $gte: new Date(nam, thang - 1, 1),
    $lt: new Date(nam, thang, 1),
  };

  const selectedPeriod = await ensureAttendancePeriod(thang, nam);

  const [employees, attendanceRows] = await Promise.all([
    entities.nhanvien.model
      .find()
      .select({ MaNhanVien: 1, HoTen: 1, MaPhongBan: 1 })
      .sort({ MaNhanVien: 1 })
      .lean(),
    entities.chamcong.model
      .find({ NgayCong: range })
      .sort({ NgayCong: 1, MaNhanVien: 1 })
      .lean(),
  ]);

  const luongRows = await entities.luongnhanvien.model
    .find({ Nam: nam, Thang: thang })
    .select({
      MaNhanVien: 1,
      SoNgayCong: 1,
      TongGioCong: 1,
      TongGioOT: 1,
      SuDungDuLieuCongTay: 1,
      _id: 0,
    })
    .lean();

  const luongMap = Object.fromEntries(
    luongRows.map((row) => [row.MaNhanVien, row]),
  );

  const attendanceByNhanVien = attendanceRows.reduce((acc, row) => {
    const key = row.MaNhanVien;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {});

  const payrollAdjustRows = employees.map((employee) => {
    const summary = summarizeAttendanceByMonth(
      attendanceByNhanVien[employee.MaNhanVien] || [],
    )[`${nam}-${thang}`] || {
      soNgayCong: 0,
      tongGioCong: 0,
      tongGioOT: 0,
    };

    const luongRow = luongMap[employee.MaNhanVien];
    const useManual = Boolean(luongRow?.SuDungDuLieuCongTay);

    return {
      MaNhanVien: employee.MaNhanVien,
      HoTen: employee.HoTen || "",
      SoNgayCong: useManual
        ? Number(luongRow.SoNgayCong || 0)
        : summary.soNgayCong,
      TongGioCong: useManual
        ? Number(luongRow.TongGioCong || 0)
        : summary.tongGioCong,
      TongGioOT: useManual
        ? Number(luongRow.TongGioOT || 0)
        : summary.tongGioOT,
      SuDungDuLieuCongTay: useManual,
    };
  });

  const maPhongBanSet = new Set(
    employees.map((x) => x.MaPhongBan).filter(Boolean),
  );
  const phongBanRows = maPhongBanSet.size
    ? await entities.phongban.model
        .find({ MaPhongBan: { $in: [...maPhongBanSet] } })
        .lean()
    : [];

  const phongBanMap = Object.fromEntries(
    phongBanRows.map((x) => [x.MaPhongBan, x.TenPhongBan || ""]),
  );

  const employeeRows = employees.map((employee) => ({
    MaNhanVien: employee.MaNhanVien,
    HoTen: employee.HoTen || "",
    TenPhongBan: phongBanMap[employee.MaPhongBan] || "",
  }));

  const { calendarDays, rows } = buildMonthlyAttendanceRows(
    employeeRows,
    attendanceRows,
    thang,
    nam,
  );

  res.render("attendance-detail", {
    title: `Xem chi tiết bảng công ${thang}/${nam}`,
    entities,
    thang,
    nam,
    calendarDays,
    rows,
    totalEmployees: employeeRows.length,
    selectedPeriod,
    payrollAdjustRows,
  });
});

router.get("/api/thongbao-moi", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 8);
    const items = await getDailyNewsItems(Number.isNaN(limit) ? 8 : limit);
    res.json({
      fetchedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không lấy được thông báo mới",
      error: error.message,
    });
  }
});

router.get("/nhanvien/template-csv", (req, res) => {
  const header = NHAN_VIEN_CSV_FIELDS.join(",");
  const sample = [
    "NV007",
    "Nguyen Van A",
    "1995-06-21",
    "Nam",
    "012345678901",
    "nguyenvana@example.com",
    "0901000007",
    "Can Tho",
    "2024-03-15",
    "Dang lam viec",
    "PB01",
    "CV01",
    "TD02",
    "https://example.com/avatar.jpg",
  ]
    .map((x) => toCsvValue(x))
    .join(",");

  const csv = `${header}\n${sample}\n`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="nhanvien-template.csv"',
  );
  res.send(`\uFEFF${csv}`);
});

router.get("/nhanvien/export-csv", async (req, res) => {
  const { query } = buildNhanVienQuery(req.query);
  const rows = await entities.nhanvien.model
    .find(query)
    .sort({ MaNhanVien: 1 })
    .lean();

  const header = NHAN_VIEN_CSV_FIELDS.join(",");
  const lines = rows.map((row) =>
    NHAN_VIEN_CSV_FIELDS.map((field) => {
      if (field === "NgaySinh" || field === "NgayVaoLam") {
        return toCsvValue(formatDateForCsv(row[field]));
      }
      return toCsvValue(row[field] || "");
    }).join(","),
  );

  const csv = `${header}\n${lines.join("\n")}\n`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="nhanvien-export-${Date.now()}.csv"`,
  );
  res.send(`\uFEFF${csv}`);
});

router.post("/nhanvien/import-csv", async (req, res) => {
  const csvText = String(req.body.csvText || "");
  if (!csvText.trim()) {
    return res.status(400).json({
      message: "File CSV trống hoặc không hợp lệ.",
    });
  }

  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return res.status(400).json({
      message: "CSV cần có dòng tiêu đề và ít nhất 1 dòng dữ liệu.",
    });
  }

  const header = parseCsvLine(lines[0]);
  const validHeader = NHAN_VIEN_CSV_FIELDS.every(
    (field, index) => header[index] === field,
  );
  if (!validHeader) {
    return res.status(400).json({
      message: "Sai cấu trúc cột CSV. Vui lòng dùng file template.",
      expectedHeader: NHAN_VIEN_CSV_FIELDS,
      actualHeader: header,
    });
  }

  const operations = [];
  const errors = [];

  lines.slice(1).forEach((line, lineIndex) => {
    const rowIndex = lineIndex + 2;
    const values = parseCsvLine(line);

    const record = {};
    NHAN_VIEN_CSV_FIELDS.forEach((field, fieldIndex) => {
      record[field] = String(values[fieldIndex] || "").trim();
    });

    if (!record.MaNhanVien || !record.HoTen) {
      errors.push(`Dòng ${rowIndex}: thiếu MaNhanVien hoặc HoTen`);
      return;
    }

    const payload = {
      MaNhanVien: record.MaNhanVien,
      HoTen: record.HoTen,
      HinhAnh: record.HinhAnh,
      GioiTinh: record.GioiTinh,
      CCCD: record.CCCD,
      Email: record.Email,
      SoDienThoai: record.SoDienThoai,
      DiaChi: record.DiaChi,
      TrangThai_NhanVien: record.TrangThai_NhanVien,
      MaPhongBan: record.MaPhongBan,
      MaChucVu: record.MaChucVu,
      MaTrinhDo: record.MaTrinhDo,
      NgaySinh: parseDateInput(record.NgaySinh),
      NgayVaoLam: parseDateInput(record.NgayVaoLam),
    };

    operations.push({
      updateOne: {
        filter: { MaNhanVien: record.MaNhanVien },
        update: { $set: payload },
        upsert: true,
      },
    });
  });

  if (!operations.length) {
    return res.status(400).json({
      message: "Không có dòng dữ liệu hợp lệ để import.",
      errors,
    });
  }

  await entities.nhanvien.model.bulkWrite(operations);

  return res.json({
    message: "Import CSV thành công.",
    importedCount: operations.length,
    warningCount: errors.length,
    warnings: errors,
  });
});

router.get("/he-so-luong", async (req, res) => {
  const keywordRaw = String(req.query.keyword || "").trim();
  const flashStatus = String(req.query.status || "")
    .trim()
    .toLowerCase();
  const flashMessage = String(req.query.message || "").trim();

  const query = {};
  if (keywordRaw) {
    const regex = { $regex: escapeRegex(keywordRaw), $options: "i" };
    query.$or = [{ MaNhanVien: regex }, { HoTen: regex }];
  }

  const nhanVienRows = await entities.nhanvien.model
    .find(query)
    .sort({ MaNhanVien: 1 })
    .select({ MaNhanVien: 1, HoTen: 1, MaPhongBan: 1, MaChucVu: 1, _id: 0 })
    .lean();

  const maNhanVienList = nhanVienRows
    .map((item) => item.MaNhanVien)
    .filter(Boolean);
  const hopDongRows = maNhanVienList.length
    ? await entities.hopdong.model
        .find({ MaNhanVien: { $in: maNhanVienList } })
        .sort({ NgayBatDau: -1, MaHopDong: -1 })
        .lean()
    : [];

  const hopDongByNhanVien = hopDongRows.reduce((acc, item) => {
    const key = String(item.MaNhanVien || "");
    if (!key) return acc;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const now = new Date();
  const thang = now.getMonth() + 1;
  const nam = now.getFullYear();

  const rows = nhanVienRows.map((employee) => {
    const contracts = hopDongByNhanVien[employee.MaNhanVien] || [];
    const effectiveContract = pickEffectiveContract(contracts, thang, nam);

    if (!effectiveContract) {
      return {
        ...employee,
        hasContract: false,
        MaHopDong: "",
        LoaiHopDong: "--",
        TrangThai_HopDong: "Chưa có hợp đồng",
        HeSoLuong: 1,
        MucLuong: 0,
        LuongApDung: 0,
      };
    }

    const heSoLuong = Number(effectiveContract.HeSoLuong || 1);
    const mucLuong = Number(effectiveContract.MucLuong || 0);
    return {
      ...employee,
      hasContract: true,
      MaHopDong: effectiveContract.MaHopDong || "",
      LoaiHopDong: effectiveContract.LoaiHopDong || "--",
      TrangThai_HopDong: effectiveContract.TrangThai_HopDong || "--",
      HeSoLuong: Number.isFinite(heSoLuong) ? heSoLuong : 1,
      MucLuong: Number.isFinite(mucLuong) ? mucLuong : 0,
      LuongApDung: Math.round(
        (Number.isFinite(mucLuong) ? mucLuong : 0) *
          (Number.isFinite(heSoLuong) ? heSoLuong : 1),
      ),
    };
  });

  res.render("salary-coefficient", {
    title: "Chỉnh hệ số lương",
    entities,
    entityName: "",
    keyword: keywordRaw,
    rows,
    flash: {
      status: flashStatus,
      message: flashMessage,
      isSuccess: flashStatus === "success",
      isError: flashStatus === "error",
    },
    formatNumberComma: (value) =>
      new Intl.NumberFormat("vi-VN").format(Number(value) || 0),
  });
});

router.post("/he-so-luong/:maHopDong", async (req, res) => {
  const maHopDong = String(req.params.maHopDong || "").trim();
  const keywordRaw = String(req.body.keyword || "").trim();

  const buildRedirectUrl = (status, message) => {
    const params = new URLSearchParams();
    if (keywordRaw) params.set("keyword", keywordRaw);
    if (status) params.set("status", status);
    if (message) params.set("message", message);
    const query = params.toString();
    return `/admin/he-so-luong${query ? `?${query}` : ""}`;
  };

  if (!maHopDong) {
    return res.redirect(
      buildRedirectUrl("error", "Khong+xac+dinh+duoc+hop+dong+can+cap+nhat"),
    );
  }

  const heSoLuongRaw = String(req.body.heSoLuong || "")
    .trim()
    .replace(/,/g, ".");
  const heSoLuong = Number.parseFloat(heSoLuongRaw);

  if (!Number.isFinite(heSoLuong) || heSoLuong <= 0 || heSoLuong > 20) {
    return res.redirect(
      buildRedirectUrl(
        "error",
        "He+so+luong+phai+la+so+duong+va+khong+vuot+qua+20",
      ),
    );
  }

  const existing = await entities.hopdong.model
    .findOne({ MaHopDong: maHopDong })
    .lean();

  if (!existing) {
    return res.redirect(
      buildRedirectUrl("error", "Khong+tim+thay+hop+dong+de+cap+nhat"),
    );
  }

  await entities.hopdong.model.findOneAndUpdate(
    { MaHopDong: maHopDong },
    {
      HeSoLuong: heSoLuong,
    },
    { runValidators: true },
  );

  return res.redirect(
    buildRedirectUrl(
      "success",
      `Da+cap+nhat+he+so+luong+cho+hop+dong+${maHopDong}`,
    ),
  );
});

router.get("/:entity", async (req, res) => {
  const entity = getEntity(req.params.entity);
  if (!entity) {
    return res.status(404).send("Không tìm thấy module");
  }

  let data = [];
  let attendanceDetailRows = [];
  let attendanceFilters = {
    ngay: "",
  };
  let nhanVienRows = [];
  let luongNhanVienRows = [];
  let luongFilters = {
    thangNam: "",
  };
  let luongPrintOptions = {
    printAll: false,
  };
  let nhanVienFilters = {
    keyword: "",
    maPhongBan: "",
    maChucVu: "",
  };
  let nhanVienFilterOptions = {
    phongBan: [],
    chucVu: [],
  };

  if (req.params.entity === "chamcong") {
    const ngayRaw = String(req.query.ngay || "").trim();
    attendanceFilters = {
      ngay: ngayRaw,
    };

    const query = {};
    if (ngayRaw) {
      const normalizedDateText = ngayRaw.replace(/\//g, "-");
      const matched = normalizedDateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (matched) {
        const year = Number(matched[1]);
        const month = Number(matched[2]);
        const day = Number(matched[3]);
        const startOfDay = new Date(year, month - 1, day);

        if (
          startOfDay.getFullYear() === year &&
          startOfDay.getMonth() === month - 1 &&
          startOfDay.getDate() === day
        ) {
          const endOfDay = new Date(year, month - 1, day + 1);
          query.NgayCong = {
            $gte: startOfDay,
            $lt: endOfDay,
          };
        }
      }
    }

    data = await entity.model
      .find(query)
      .sort({ NgayCong: -1, MaNhanVien: 1 })
      .lean();

    const maNhanVienList = [
      ...new Set(data.map((x) => x.MaNhanVien).filter(Boolean)),
    ];
    const nhanVienList = maNhanVienList.length
      ? await entities.nhanvien.model
          .find({ MaNhanVien: { $in: maNhanVienList } })
          .lean()
      : [];
    const nhanVienMap = Object.fromEntries(
      nhanVienList.map((x) => [x.MaNhanVien, x.HoTen || ""]),
    );

    attendanceDetailRows = data.map((row) => ({
      ...row,
      HoTen: nhanVienMap[row.MaNhanVien] || "",
    }));
  } else if (req.params.entity === "nhanvien") {
    const { query, filters } = buildNhanVienQuery(req.query);
    nhanVienFilters = filters;

    const [employees, phongBanRows, chucVuRows] = await Promise.all([
      entity.model.find(query).sort({ MaNhanVien: 1 }).lean(),
      entities.phongban.model.find().sort({ MaPhongBan: 1 }).lean(),
      entities.chucvu.model.find().sort({ MaChucVu: 1 }).lean(),
    ]);

    const phongBanMap = Object.fromEntries(
      phongBanRows.map((x) => [x.MaPhongBan, x.TenPhongBan || ""]),
    );
    const chucVuMap = Object.fromEntries(
      chucVuRows.map((x) => [x.MaChucVu, x.TenChucVu || ""]),
    );

    nhanVienRows = employees.map((employee) => ({
      ...employee,
      TenPhongBan: phongBanMap[employee.MaPhongBan] || "",
      TenChucVu: chucVuMap[employee.MaChucVu] || "",
    }));

    nhanVienFilterOptions = {
      phongBan: phongBanRows.map((item) => ({
        MaPhongBan: item.MaPhongBan,
        TenPhongBan: item.TenPhongBan || item.MaPhongBan,
      })),
      chucVu: chucVuRows.map((item) => ({
        MaChucVu: item.MaChucVu,
        TenChucVu: item.TenChucVu || item.MaChucVu,
      })),
    };
  } else if (req.params.entity === "luongnhanvien") {
    const isPrintAllRequest = String(req.query.printAll || "") === "1";
    const thangNamRaw = isPrintAllRequest
      ? ""
      : String(req.query.thangNam || "").trim();
    luongFilters = {
      thangNam: thangNamRaw,
    };
    luongPrintOptions = {
      printAll: isPrintAllRequest,
    };

    const payrollQuery = {};
    if (thangNamRaw) {
      const matched = thangNamRaw.match(/^(\d{4})-(\d{2})$/);
      if (matched) {
        const nam = Number(matched[1]);
        const thang = Number(matched[2]);
        if (
          Number.isInteger(nam) &&
          Number.isInteger(thang) &&
          thang >= 1 &&
          thang <= 12
        ) {
          payrollQuery.Nam = nam;
          payrollQuery.Thang = thang;
        }
      }
    }

    const payrollRows = await entity.model
      .find(payrollQuery)
      .sort({ Nam: -1, Thang: -1, MaBangLuong: 1 })
      .lean();

    const maNhanVienList = [
      ...new Set(payrollRows.map((x) => x.MaNhanVien).filter(Boolean)),
    ];

    const [nhanVienList, hopDongRows, chamCongRows] = maNhanVienList.length
      ? await Promise.all([
          entities.nhanvien.model
            .find({ MaNhanVien: { $in: maNhanVienList } })
            .lean(),
          entities.hopdong.model
            .find({ MaNhanVien: { $in: maNhanVienList } })
            .select({
              MaNhanVien: 1,
              NgayBatDau: 1,
              NgayKetThuc: 1,
              MucLuong: 1,
              HeSoLuong: 1,
              SoGioCong: 1,
              PhuCapCoDinh: 1,
            })
            .lean(),
          entities.chamcong.model
            .find({ MaNhanVien: { $in: maNhanVienList } })
            .select({ MaNhanVien: 1, NgayCong: 1, TrangThai_ChamCong: 1 })
            .lean(),
        ])
      : [[], [], []];

    const nhanVienMap = Object.fromEntries(
      nhanVienList.map((item) => [item.MaNhanVien, item.HoTen || ""]),
    );

    const hopDongByNhanVien = hopDongRows.reduce((acc, item) => {
      const key = item.MaNhanVien;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    const chamCongByNhanVien = chamCongRows.reduce((acc, item) => {
      const key = item.MaNhanVien;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    luongNhanVienRows = payrollRows.map((row) => {
      const attendanceSummaryByMonth = summarizeAttendanceByMonth(
        chamCongByNhanVien[row.MaNhanVien] || [],
      );
      const attendanceSummary = attendanceSummaryByMonth[
        `${row.Nam}-${row.Thang}`
      ] || {
        soNgayCong: Number(row.SoNgayCong || 0),
        tongGioCong: 0,
        tongGioOT: 0,
      };

      const contract = pickEffectiveContract(
        hopDongByNhanVien[row.MaNhanVien] || [],
        Number(row.Thang || 0),
        Number(row.Nam || 0),
      );

      const payroll = calculatePayrollForMonth({
        salaryRow: row,
        contract,
        attendanceSummary,
        heSoOT: 1.5,
        thamGiaBHXH: false,
      });

      return {
        ...row,
        HoTen: nhanVienMap[row.MaNhanVien] || "",
        SoNgayCongTinh: payroll.soNgayCong,
        TongGioCong: payroll.tongGioCong,
        TongGioOT: payroll.tongGioOT,
        LuongChinh: payroll.luongChinh,
        LuongOT: payroll.luongOT,
        PhuCap: payroll.tongPhuCap,
        TongThuNhap: payroll.tongThuNhap,
        TongKhauTru: payroll.tongKhauTru,
        ThucNhan: payroll.tongLuongThucLinh,
      };
    });

    data = luongNhanVienRows;
  } else if (req.params.entity === "donxinnghi") {
    const leaveRows = await entity.model
      .find()
      .sort({ NgayTao: -1, MaDonNghi: -1 })
      .lean();

    const maNhanVienList = [
      ...new Set(leaveRows.map((x) => x.MaNhanVien).filter(Boolean)),
    ];
    const nhanVienRowsRaw = maNhanVienList.length
      ? await entities.nhanvien.model
          .find({ MaNhanVien: { $in: maNhanVienList } })
          .select({ MaNhanVien: 1, HoTen: 1, _id: 0 })
          .lean()
      : [];

    const nhanVienMap = Object.fromEntries(
      nhanVienRowsRaw.map((item) => [item.MaNhanVien, item.HoTen || ""]),
    );

    data = leaveRows.map((row) => ({
      ...row,
      HoTen: nhanVienMap[row.MaNhanVien] || row.MaNhanVien || "",
    }));
  } else {
    data = await entity.model
      .find()
      .sort({ [entity.keyField]: 1 })
      .lean();
  }

  res.render("entity-list", {
    title: `Quản lý ${entity.label}`,
    entities,
    entityName: req.params.entity,
    entity,
    operationNotice: String(req.query.notice || "").trim(),
    rows: data,
    attendanceDetailRows,
    attendanceFilters,
    nhanVienRows,
    luongNhanVienRows,
    luongFilters,
    luongPrintOptions,
    nhanVienFilters,
    nhanVienFilterOptions,
    keyField: entity.keyField,
    fields: toFieldMeta(entity.model, entity.keyField),
    formatDate,
  });
});

router.get("/:entity/new", async (req, res) => {
  const entity = getEntity(req.params.entity);
  if (!entity) {
    return res.status(404).send("Không tìm thấy module");
  }

  if (req.params.entity === "donxinnghi") {
    return res.redirect(
      "/admin/donxinnghi?notice=Don+xin+nghi+chi+duoc+duyet+hoac+tu+choi+tren+danh+sach",
    );
  }

  if (req.params.entity === "luongnhanvien") {
    return res.redirect(
      "/admin/luongnhanvien?notice=Bang+luong+chi+cho+phep+xem+va+in",
    );
  }

  let relationOptions = {};
  if (req.params.entity === "nhanvien") {
    relationOptions = await getNhanVienReferenceOptions();
  } else if (req.params.entity === "hopdong") {
    relationOptions = await getHopDongReferenceOptions();
  }

  const createRecord = {};

  res.render("entity-form", {
    title: `Thêm ${entity.label}`,
    entities,
    entityName: req.params.entity,
    entity,
    mode: "create",
    fields: toFieldMeta(entity.model, entity.keyField),
    record: createRecord,
    keyField: entity.keyField,
    relationOptions,
    accountDefaults: {
      createAccount: true,
      tenDangNhap: "",
      trangThaiTaiKhoan: "Hoạt động",
    },
    uploadError: String(req.query.uploadError || "").trim(),
    isAutoCodeField,
    formatDate,
  });
});

router.post("/:entity/new", parseNhanVienUpload, async (req, res) => {
  const entity = getEntity(req.params.entity);
  if (!entity) {
    return res.status(404).send("Không tìm thấy module");
  }

  if (req.params.entity === "donxinnghi") {
    return res.redirect(
      "/admin/donxinnghi?notice=Don+xin+nghi+khong+cho+tao+moi+thu+cong",
    );
  }

  if (req.params.entity === "luongnhanvien") {
    return res.redirect(
      "/admin/luongnhanvien?notice=Bang+luong+chi+cho+phep+xem+va+in",
    );
  }

  const fields = toFieldMeta(entity.model, entity.keyField);
  const payload = normalizePayload(fields, req.body, true);

  if (isAutoCodeField(entity.keyField)) {
    payload[entity.keyField] = await generateNextCode(
      entity.model,
      entity.keyField,
    );
  }

  if (req.params.entity === "hopdong") {
    const currentMaNhanVien = String(payload.MaNhanVien || "").trim();
    if (!currentMaNhanVien) {
      return res
        .status(400)
        .send("Lỗi tạo mới: Vui lòng chọn nhân viên để lập/gia hạn hợp đồng.");
    }

    const employeeExists = await entities.nhanvien.model
      .findOne({ MaNhanVien: currentMaNhanVien })
      .select({ MaNhanVien: 1, _id: 0 })
      .lean();

    if (!employeeExists) {
      return res
        .status(400)
        .send(
          "Lỗi tạo mới: Mã nhân viên không tồn tại trong quản lý nhân viên.",
        );
    }

    payload.MaNhanVien = currentMaNhanVien;
  }

  if (req.params.entity === "nhanvien") {
    if (req.file?.filename) {
      payload.HinhAnh = `/uploads/employees/${req.file.filename}`;
    }
  }

  try {
    if (req.params.entity !== "nhanvien") {
      await entity.model.create(payload);
      return res.redirect(`/admin/${req.params.entity}`);
    }

    const createAccount = String(req.body.createAccount || "") === "on";

    if (!createAccount) {
      await entity.model.create(payload);
      return res.redirect(`/admin/${req.params.entity}`);
    }

    const tenDangNhapRaw = String(req.body.TenDangNhap || "").trim();
    const tenDangNhap = tenDangNhapRaw || payload.MaNhanVien;
    const matKhau = String(req.body.MatKhau || "").trim();
    const trangThaiTaiKhoan =
      String(req.body.TrangThai_TaiKhoan || "").trim() || "Hoạt động";

    if (!matKhau) {
      return res
        .status(400)
        .send("Lỗi tạo mới: Vui lòng nhập mật khẩu cho tài khoản nhân viên.");
    }

    const existingAccount = await entities.taikhoan.model
      .findOne({
        TenDangNhap: {
          $regex: `^${escapeRegex(tenDangNhap)}$`,
          $options: "i",
        },
      })
      .lean();

    if (existingAccount) {
      return res
        .status(400)
        .send("Lỗi tạo mới: Tên đăng nhập đã tồn tại, vui lòng chọn tên khác.");
    }

    const createdNhanVien = await entity.model.create(payload);

    try {
      await entities.taikhoan.model.create({
        TenDangNhap: tenDangNhap,
        MatKhau: matKhau,
        TrangThai_TaiKhoan: trangThaiTaiKhoan,
      });
    } catch (accountError) {
      await entity.model.findOneAndDelete({
        MaNhanVien: createdNhanVien.MaNhanVien,
      });
      throw accountError;
    }

    res.redirect(`/admin/${req.params.entity}`);
  } catch (error) {
    res.status(400).send(`Lỗi tạo mới: ${error.message}`);
  }
});

router.get("/:entity/:key/edit", async (req, res) => {
  const entity = getEntity(req.params.entity);
  if (!entity) {
    return res.status(404).send("Không tìm thấy module");
  }

  if (req.params.entity === "donxinnghi") {
    return res.redirect(
      "/admin/donxinnghi?notice=Vui+long+su+dung+nut+Dong+y%2FKhong+dong+y+tren+danh+sach",
    );
  }

  if (req.params.entity === "luongnhanvien") {
    return res.redirect(
      "/admin/luongnhanvien?notice=Bang+luong+chi+cho+phep+xem+va+in",
    );
  }

  if (req.params.entity === "hopdong") {
    return res.redirect(
      "/admin/hopdong?notice=Hop+dong+khong+cho+phep+sua%2C+chi+cho+phep+admin+xoa",
    );
  }

  const record = await entity.model
    .findOne({ [entity.keyField]: req.params.key })
    .lean();
  if (!record) {
    return res.status(404).send("Không tìm thấy dữ liệu");
  }

  const relationOptions =
    req.params.entity === "nhanvien" ? await getNhanVienReferenceOptions() : {};

  res.render("entity-form", {
    title: `Cập nhật ${entity.label}`,
    entities,
    entityName: req.params.entity,
    entity,
    mode: "edit",
    fields: toFieldMeta(entity.model, entity.keyField),
    record,
    keyField: entity.keyField,
    relationOptions,
    uploadError: String(req.query.uploadError || "").trim(),
    isAutoCodeField,
    formatDate,
  });
});

router.post("/donxinnghi/:key/duyet", async (req, res) => {
  const existing = await entities.donxinnghi.model
    .findOne({ MaDonNghi: req.params.key })
    .lean();

  if (!existing) {
    return res.redirect("/admin/donxinnghi?notice=Khong+tim+thay+don+xin+nghi");
  }

  if (isFinalizedLeaveStatus(existing.TrangThaiDon || "")) {
    return res.redirect(
      "/admin/donxinnghi?notice=Don+xin+nghi+da+duoc+xu+ly%2C+chi+con+nut+xoa",
    );
  }

  await entities.donxinnghi.model.findOneAndUpdate(
    { MaDonNghi: req.params.key },
    {
      TrangThaiDon: "Da duyet",
      PhanHoiAdmin: "Đơn xin nghỉ đã được chấp thuận.",
      NgayCapNhat: new Date(),
    },
    { runValidators: true },
  );

  const updated = await entities.donxinnghi.model
    .findOne({ MaDonNghi: req.params.key })
    .lean();

  if (updated) {
    await applyApprovedLeaveToAttendance(updated);
  }

  return res.redirect("/admin/donxinnghi?notice=Da+dong+y+don+xin+nghi");
});

router.post("/donxinnghi/:key/khong-dong-y", async (req, res) => {
  const existing = await entities.donxinnghi.model
    .findOne({ MaDonNghi: req.params.key })
    .lean();

  if (!existing) {
    return res.redirect("/admin/donxinnghi?notice=Khong+tim+thay+don+xin+nghi");
  }

  if (isFinalizedLeaveStatus(existing.TrangThaiDon || "")) {
    return res.redirect(
      "/admin/donxinnghi?notice=Don+xin+nghi+da+duoc+xu+ly%2C+chi+con+nut+xoa",
    );
  }

  await entities.donxinnghi.model.findOneAndUpdate(
    { MaDonNghi: req.params.key },
    {
      TrangThaiDon: "Tu choi",
      PhanHoiAdmin: "Đơn xin nghỉ không được chấp thuận.",
      NgayCapNhat: new Date(),
    },
    { runValidators: true },
  );

  return res.redirect("/admin/donxinnghi?notice=Da+cap+nhat+Khong+dong+y");
});

router.post("/:entity/:key/edit", parseNhanVienUpload, async (req, res) => {
  const entity = getEntity(req.params.entity);
  if (!entity) {
    return res.status(404).send("Không tìm thấy module");
  }

  if (req.params.entity === "luongnhanvien") {
    return res.redirect(
      "/admin/luongnhanvien?notice=Bang+luong+chi+cho+phep+xem+va+in",
    );
  }

  if (req.params.entity === "hopdong") {
    return res.redirect(
      "/admin/hopdong?notice=Hop+dong+khong+cho+phep+sua%2C+chi+cho+phep+admin+xoa",
    );
  }

  const fields = toFieldMeta(entity.model, entity.keyField);
  const payload = normalizePayload(fields, req.body, false);
  const previousRecord =
    req.params.entity === "donxinnghi"
      ? await entity.model.findOne({ [entity.keyField]: req.params.key }).lean()
      : null;

  if (req.params.entity === "nhanvien") {
    const currentHinhAnh = String(req.body.currentHinhAnh || "").trim();
    const textHinhAnh = String(req.body.HinhAnh || "").trim();

    if (req.file?.filename) {
      payload.HinhAnh = `/uploads/employees/${req.file.filename}`;
    } else if (!textHinhAnh && currentHinhAnh) {
      payload.HinhAnh = currentHinhAnh;
    }
  }

  try {
    await entity.model.findOneAndUpdate(
      { [entity.keyField]: req.params.key },
      payload,
      { runValidators: true },
    );

    if (req.params.entity === "donxinnghi") {
      const updatedRecord = await entity.model
        .findOne({ [entity.keyField]: req.params.key })
        .lean();

      const becameApproved =
        isApprovedLeaveStatus(updatedRecord?.TrangThaiDon || "") &&
        !isApprovedLeaveStatus(previousRecord?.TrangThaiDon || "");
      const stillApproved = isApprovedLeaveStatus(
        updatedRecord?.TrangThaiDon || "",
      );

      if (becameApproved || stillApproved) {
        await applyApprovedLeaveToAttendance(updatedRecord);
      }
    }

    res.redirect(`/admin/${req.params.entity}`);
  } catch (error) {
    res.status(400).send(`Lỗi cập nhật: ${error.message}`);
  }
});

router.post("/:entity/:key/delete", async (req, res) => {
  const entity = getEntity(req.params.entity);
  if (!entity) {
    return res.status(404).send("Không tìm thấy module");
  }

  if (req.params.entity === "luongnhanvien") {
    return res.redirect(
      "/admin/luongnhanvien?notice=Bang+luong+chi+cho+phep+xem+va+in",
    );
  }

  await entity.model.findOneAndDelete({ [entity.keyField]: req.params.key });
  res.redirect(`/admin/${req.params.entity}`);
});

module.exports = router;
