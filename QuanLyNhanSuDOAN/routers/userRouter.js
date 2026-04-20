const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const NhanVien = require("../models/NhanVien");
const TaiKhoan = require("../models/TaiKhoan");
const ChamCong = require("../models/ChamCong");
const HopDong = require("../models/HopDong");
const DonXinNghi = require("../models/DonXinNghi");
const LuongNhanVien = require("../models/LuongNhanVien");
const PhongBan = require("../models/PhongBan");
const ChucVu = require("../models/ChucVu");
const TrinhDo = require("../models/TrinhDo");
const { getDailyNewsItems } = require("../modules/newsService");
const {
  summarizeAttendanceByMonth,
  pickEffectiveContract,
  calculatePayrollForMonth,
} = require("../modules/salaryCalculator");
const {
  ensureAttendancePeriod,
  ensureCurrentAttendancePeriod,
  isAttendancePeriodOpen,
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

const profileAvatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, EMPLOYEE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".jpg";
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `nhanvien-self-${unique}${safeExt}`);
  },
});

const uploadProfileAvatar = multer({
  storage: profileAvatarStorage,
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
const OFFICE_LOCATION = {
  lat: 10.3872,
  lng: 105.4355,
  label: "Đèn 4 Ngọn, Long Xuyên",
};
const CHECK_IN_WINDOW = {
  startMinutes: 8 * 60,
  endMinutes: 17 * 60,
  label: "08:00 - 17:00",
};
const CHECK_IN_MAX_DISTANCE_METERS = 300;

function getMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinCheckInWindow(date = new Date()) {
  const minutes = getMinutesOfDay(date);
  return (
    minutes >= CHECK_IN_WINDOW.startMinutes &&
    minutes <= CHECK_IN_WINDOW.endMinutes
  );
}

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function resolveEmployee(maNhanVien) {
  if (maNhanVien) {
    return NhanVien.findOne({ MaNhanVien: maNhanVien }).lean();
  }
  return null;
}

async function syncPayrollAttendanceSnapshot(maNhanVien, date = new Date()) {
  if (!maNhanVien) return;

  const thang = date.getMonth() + 1;
  const nam = date.getFullYear();

  const [attendanceRows, salaryRows] = await Promise.all([
    ChamCong.find({
      MaNhanVien: maNhanVien,
      NgayCong: {
        $gte: new Date(nam, thang - 1, 1),
        $lt: new Date(nam, thang, 1),
      },
    })
      .select({ NgayCong: 1, TrangThai_ChamCong: 1, _id: 0 })
      .lean(),
    LuongNhanVien.find({
      MaNhanVien: maNhanVien,
      Thang: thang,
      Nam: nam,
    })
      .select({ MaBangLuong: 1, SuDungDuLieuCongTay: 1, _id: 0 })
      .lean(),
  ]);

  if (salaryRows.some((row) => row.SuDungDuLieuCongTay)) {
    return;
  }

  const summary = summarizeAttendanceByMonth(attendanceRows)[
    `${nam}-${thang}`
  ] || {
    soNgayCong: 0,
    tongGioCong: 0,
    tongGioOT: 0,
  };

  const updatePayload = {
    SoNgayCong: Number(summary.soNgayCong || 0),
    TongGioCong: Number(summary.tongGioCong || 0),
    TongGioOT: Number(summary.tongGioOT || 0),
    SuDungDuLieuCongTay: false,
  };

  if (salaryRows.length) {
    await LuongNhanVien.updateMany(
      {
        MaNhanVien: maNhanVien,
        Thang: thang,
        Nam: nam,
        SuDungDuLieuCongTay: { $ne: true },
      },
      { $set: updatePayload },
      { runValidators: true },
    );
    return;
  }

  const maBangLuongAuto = `AUTO-${maNhanVien}-${nam}${String(thang).padStart(2, "0")}`;
  await LuongNhanVien.findOneAndUpdate(
    { MaBangLuong: maBangLuongAuto },
    {
      $set: updatePayload,
      $setOnInsert: {
        MaBangLuong: maBangLuongAuto,
        MaNhanVien: maNhanVien,
        Thang: thang,
        Nam: nam,
        Thuong: 0,
        KhauTru: 0,
      },
    },
    {
      upsert: true,
      runValidators: true,
    },
  );
}

function formatCurrency(number) {
  if (!number) return "0 đ";
  return `${new Intl.NumberFormat("vi-VN").format(number)} đ`;
}

function formatTodayLabel(date = new Date()) {
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  return `${weekdays[date.getDay()]}, ${date.toLocaleDateString("vi-VN")}`;
}

function formatCurrentTime(date = new Date()) {
  return date.toLocaleTimeString("vi-VN", { hour12: false });
}

function formatCheckInTime(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour12: false });
}

function formatLongDate(date = new Date()) {
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const dayName = weekdays[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${dayName}, ${day} tháng ${month}, ${year}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Chưa cập nhật";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function diffDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to.getTime() - from.getTime()) / msPerDay);
}

function parseMonthYear(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

function parseMonthFilter(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    return fallback;
  }
  return parsed;
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

function buildAvatarUpdateViewModel(status = "", message = "") {
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

function buildLeaveRequestFlash(status = "", message = "") {
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

function normalizeLeaveStatus(status = "") {
  const normalized = normalizeText(status);
  if (/\bda\s*duyet\b|\bapproved\b/.test(normalized)) {
    return { label: "Đã duyệt", className: "approved" };
  }
  if (/\btu\s*choi\b|\breject(ed)?\b/.test(normalized)) {
    return { label: "Từ chối", className: "rejected" };
  }
  return { label: "Chờ duyệt", className: "pending" };
}

async function buildEmployeeView(employee) {
  if (!employee) return null;

  const [phongBan, chucVu, trinhDo] = await Promise.all([
    employee.MaPhongBan
      ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
      : null,
    employee.MaChucVu
      ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
      : null,
    employee.MaTrinhDo
      ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
      : null,
  ]);

  return {
    ...employee,
    TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
    TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
    TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
  };
}

async function generateLeaveRequestCode(maNhanVien = "") {
  const cleanMaNhanVien = String(maNhanVien || "").trim() || "NV";
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");

  for (let index = 1; index <= 50; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const code = `DXN-${cleanMaNhanVien}-${datePart}-${suffix}`;
    const existed = await DonXinNghi.findOne({ MaDonNghi: code })
      .select({ MaDonNghi: 1, _id: 0 })
      .lean();
    if (!existed) return code;
  }

  return `DXN-${cleanMaNhanVien}-${datePart}-${Date.now().toString().slice(-4)}`;
}

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseCoordinateInput(value, min, max) {
  const parsed = Number.parseFloat(String(value || "").trim());
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(fromLat, fromLng, toLat, toLng) {
  const earthRadius = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function toCurrency(number) {
  return `${new Intl.NumberFormat("vi-VN").format(number || 0)} đ`;
}

function normalizeAttendanceStatus(status = "") {
  const raw = String(status || "").trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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

function extractHourHintsFromAttendanceStatus(status = "") {
  const normalized = normalizeText(status);

  if (/nghi\s*phep|vang|nghi|off|absent/.test(normalized)) {
    return { workHours: 0, otHours: 0, isPresent: false };
  }

  const isPresent = /di\s*lam|co\s*cong|present|work/.test(normalized);
  let workHours = isPresent ? 8 : 0;
  let otHours = 0;

  const explicitHourMatches = [
    ...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(gio|h)/g),
  ];

  if (explicitHourMatches.length) {
    const totalMatchedHours = explicitHourMatches.reduce((sum, match) => {
      const value = Number.parseFloat(match[1]);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    if (/ot|tang\s*ca|overtime/.test(normalized)) {
      otHours = totalMatchedHours;
    } else {
      workHours = totalMatchedHours;
    }
  }

  if (/ot|tang\s*ca|overtime/.test(normalized) && otHours === 0) {
    otHours = 2;
  }

  return { workHours, otHours, isPresent };
}

function buildDailyPayrollRows(
  attendanceRows = [],
  contract = null,
  heSoOT = 1.5,
) {
  const luongCoBan = (contract?.MucLuong || 0) * (contract?.HeSoLuong || 1);
  const gioCongChuanThang =
    contract?.SoGioCong > 0 ? contract.SoGioCong : 26 * 8;
  const donGiaGioCong =
    gioCongChuanThang > 0 ? luongCoBan / gioCongChuanThang : 0;

  return attendanceRows
    .map((row) => {
      const ngayCong = row?.NgayCong ? new Date(row.NgayCong) : null;
      if (!ngayCong || Number.isNaN(ngayCong.getTime())) return null;

      const status = normalizeAttendanceStatus(row.TrangThai_ChamCong || "");
      const { workHours, otHours, isPresent } =
        extractHourHintsFromAttendanceStatus(row.TrangThai_ChamCong || "");

      const luongGioCong = Math.round(workHours * donGiaGioCong);
      const luongGioOT = Math.round(otHours * donGiaGioCong * heSoOT);
      const tongLuongNgay = luongGioCong + luongGioOT;

      return {
        date: ngayCong,
        ngayText: ngayCong.toLocaleDateString("vi-VN"),
        thuText: ngayCong.toLocaleDateString("vi-VN", { weekday: "long" }),
        statusLabel: status.label,
        statusClassName: status.className,
        checkInTimeText: row?.ThoiDiemCheckIn
          ? new Date(row.ThoiDiemCheckIn).toLocaleTimeString("vi-VN", {
              hour12: false,
            })
          : "--:--",
        workHours,
        otHours,
        luongGioCong,
        luongGioOT,
        tongLuongNgay,
        isPresent,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
}

function getMonthCalendarDays(month, year) {
  const fixedDaysPerMonth = 30;
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  const baseDate = new Date(year, month - 1, 1);

  return Array.from({ length: fixedDaysPerMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + index);
    const weekday = weekdays[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      day,
      weekday,
      isWeekend,
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
    attendanceMap.set(`${item.MaNhanVien}-${day}`, {
      status: item.TrangThai_ChamCong || "",
      checkInTimeText: formatCheckInTime(item.ThoiDiemCheckIn),
    });
  });

  const rows = employeeRows.map((employee) => {
    const dayCells = calendarDays.map((dayInfo) => {
      const key = `${employee.MaNhanVien}-${dayInfo.day}`;
      const payload = attendanceMap.get(key) || {
        status: "",
        checkInTimeText: "",
      };
      const status = normalizeAttendanceStatus(payload.status);
      return {
        day: dayInfo.day,
        weekday: dayInfo.weekday,
        isWeekend: dayInfo.isWeekend,
        status,
        checkInTimeText: payload.checkInTimeText || "",
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

router.get("/", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const now = new Date();
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.render("user/dashboard", {
      title: "Trang chủ nhân viên",
      activeMenu: "home",
      employee: null,
      todayLabel: formatTodayLabel(now),
      currentTime: formatCurrentTime(now),
      quickCards: [
        {
          icon: "bi-person-vcard-fill",
          title: "Hồ sơ cá nhân",
          subtitle: "Cập nhật thông tin nhân sự theo hồ sơ hệ thống.",
          href: "/user/hoso",
          action: "Xem hồ sơ",
        },
      ],
      notifications: [],
    });
  }

  const [phongBan, chucVu, trinhDo, notifications] = await Promise.all([
    employee.MaPhongBan
      ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
      : null,
    employee.MaChucVu
      ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
      : null,
    employee.MaTrinhDo
      ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
      : null,
    getDailyNewsItems(6).catch(() => []),
  ]);

  const employeeView = {
    ...employee,
    TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
    TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
    TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
  };

  const quickCards = [
    {
      icon: "bi-person-vcard-fill",
      title: "Hồ sơ cá nhân",
      subtitle: "Xem thông tin nhân viên, chức vụ và phòng ban hiện tại.",
      href: "/user/hoso",
      action: "Mở hồ sơ",
    },
    {
      icon: "bi-calendar-check-fill",
      title: "Chấm công",
      subtitle: "Theo dõi trạng thái công theo từng ngày trong tháng.",
      href: "/user/cham-cong/tram",
      action: "Chấm công ngay",
    },
    {
      icon: "bi-cash-coin",
      title: "Bảng lương",
      subtitle: "Kiểm tra lương thực nhận, thưởng và khấu trừ từng kỳ.",
      href: "/user/bang-luong",
      action: "Xem lương",
    },
    {
      icon: "bi-envelope-paper-heart-fill",
      title: "Xin nghỉ online",
      subtitle:
        "Gửi đơn xin nghỉ và theo dõi trạng thái duyệt ngay trên hệ thống.",
      href: "/user/xin-nghi",
      action: "Tạo đơn nghỉ",
    },
  ];

  return res.render("user/dashboard", {
    title: "Trang chủ nhân viên",
    activeMenu: "home",
    employee: employeeView,
    todayLabel: formatTodayLabel(now),
    currentTime: formatCurrentTime(now),
    quickCards,
    notifications,
  });
});

router.get("/hoso", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.render("user/profile", {
      title: "Hồ sơ nhân viên",
      activeMenu: "hoso",
      employee: null,
      profile: null,
    });
  }

  const [phongBan, chucVu, trinhDo] = await Promise.all([
    employee.MaPhongBan
      ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
      : null,
    employee.MaChucVu
      ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
      : null,
    employee.MaTrinhDo
      ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
      : null,
  ]);

  const profile = {
    MaNhanVien: employee.MaNhanVien,
    HoTen: employee.HoTen || "Chưa cập nhật",
    HinhAnh: employee.HinhAnh || "",
    GioiTinh: employee.GioiTinh || "Chưa cập nhật",
    NgaySinh: formatDate(employee.NgaySinh),
    NgayVaoLam: formatDate(employee.NgayVaoLam),
    CCCD: employee.CCCD || "Chưa cập nhật",
    Email: employee.Email || "Chưa cập nhật",
    SoDienThoai: employee.SoDienThoai || "Chưa cập nhật",
    DiaChi: employee.DiaChi || "Chưa cập nhật",
    TrangThai: employee.TrangThai_NhanVien || "Chưa cập nhật",
    TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
    TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
    TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
  };

  return res.render("user/profile", {
    title: "Hồ sơ nhân viên",
    activeMenu: "hoso",
    employee: {
      ...employee,
      TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
      TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
      TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
    },
    profile,
    avatarUpdate: buildAvatarUpdateViewModel(
      req.query.avatarStatus,
      req.query.avatarMessage,
    ),
  });
});

router.post("/hoso/cap-nhat-anh", (req, res) => {
  uploadProfileAvatar.single("avatarFile")(req, res, async (error) => {
    const redirectBase = "/user/hoso";

    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Anh vuot qua gioi han 12MB"
          : error.message;
      return res.redirect(
        `${redirectBase}?avatarStatus=error&avatarMessage=${encodeURIComponent(message)}`,
      );
    }

    const maNhanVien = String(req.session?.user?.maNhanVien || "").trim();
    if (!maNhanVien) {
      return res.redirect(
        `${redirectBase}?avatarStatus=error&avatarMessage=Khong+xac+dinh+duoc+nhan+vien`,
      );
    }

    if (!req.file?.filename) {
      return res.redirect(
        `${redirectBase}?avatarStatus=error&avatarMessage=Vui+long+chon+anh+truoc+khi+luu`,
      );
    }

    try {
      await NhanVien.findOneAndUpdate(
        { MaNhanVien: maNhanVien },
        { HinhAnh: `/uploads/employees/${req.file.filename}` },
        { runValidators: true },
      );

      return res.redirect(
        `${redirectBase}?avatarStatus=success&avatarMessage=Doi+anh+dai+dien+thanh+cong`,
      );
    } catch (_dbError) {
      return res.redirect(
        `${redirectBase}?avatarStatus=error&avatarMessage=Khong+the+luu+anh+vao+ho+so`,
      );
    }
  });
});

router.get("/hop-dong", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.render("user/contract", {
      title: "Hợp đồng của tôi",
      activeMenu: "hopdong",
      employee: null,
      currentContract: null,
      contracts: [],
    });
  }

  const [phongBan, chucVu, trinhDo, contracts] = await Promise.all([
    employee.MaPhongBan
      ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
      : null,
    employee.MaChucVu
      ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
      : null,
    employee.MaTrinhDo
      ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
      : null,
    HopDong.find({ MaNhanVien: employee.MaNhanVien })
      .sort({ NgayBatDau: -1, MaHopDong: -1 })
      .lean(),
  ]);

  const normalizedContracts = contracts.map((item) => {
    const ngayBatDau = item.NgayBatDau ? new Date(item.NgayBatDau) : null;
    const ngayKetThuc = item.NgayKetThuc ? new Date(item.NgayKetThuc) : null;
    const now = new Date();
    const heSoLuong = Number(item.HeSoLuong || 0);
    const mucLuong = Number(item.MucLuong || 0);
    const phuCapCoDinh = Number(item.PhuCapCoDinh || 0);
    const luongApDung = Math.round(mucLuong * heSoLuong);
    const tongThuNhapCoBan = luongApDung + phuCapCoDinh;

    const soNgayHieuLuc =
      ngayBatDau && ngayKetThuc ? diffDays(ngayBatDau, ngayKetThuc) : null;
    const conHanSau = ngayKetThuc ? diffDays(now, ngayKetThuc) : null;

    let tinhTrangHieuLuc = "Không xác định";
    if (ngayBatDau && now < ngayBatDau) {
      tinhTrangHieuLuc = "Chưa hiệu lực";
    } else if (ngayKetThuc && now > ngayKetThuc) {
      tinhTrangHieuLuc = "Đã hết hạn";
    } else {
      tinhTrangHieuLuc = "Đang hiệu lực";
    }

    return {
      ...item,
      NgayBatDauText: formatDate(item.NgayBatDau),
      NgayKetThucText: item.NgayKetThuc
        ? formatDate(item.NgayKetThuc)
        : "Không xác định",
      MucLuongText: toCurrency(mucLuong),
      PhuCapCoDinhText: toCurrency(phuCapCoDinh),
      HeSoLuongText: heSoLuong.toFixed(2),
      LuongApDungText: toCurrency(luongApDung),
      TongThuNhapCoBanText: toCurrency(tongThuNhapCoBan),
      SoGioCongText: `${item.SoGioCong || 0} giờ/tháng`,
      SoNgayHieuLucText:
        soNgayHieuLuc === null ? "Không xác định" : `${soNgayHieuLuc} ngày`,
      ConHanSauText:
        conHanSau === null
          ? "Không xác định"
          : conHanSau >= 0
            ? `Còn ${conHanSau} ngày`
            : `Quá hạn ${Math.abs(conHanSau)} ngày`,
      TinhTrangHieuLuc: tinhTrangHieuLuc,
      IsDangHieuLuc: tinhTrangHieuLuc === "Đang hiệu lực",
    };
  });

  const currentContract = normalizedContracts[0] || null;

  return res.render("user/contract", {
    title: "Hợp đồng của tôi",
    activeMenu: "hopdong",
    employee: {
      ...employee,
      TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
      TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
      TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
    },
    currentContract,
    contracts: normalizedContracts,
  });
});

router.get("/cham-cong", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const now = new Date();
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.render("user/attendance", {
      title: "Bảng chấm công",
      activeMenu: "bangcong",
      employee: null,
      calendarDays: [],
      matrixRows: [],
      summary: {
        totalDays: 0,
        totalPresent: 0,
        totalOff: 0,
      },
      markedDays: [],
      filters: {
        thang: now.getMonth() + 1,
        nam: now.getFullYear(),
      },
      yearOptions: [now.getFullYear()],
    });
  }

  const thang = parseMonthYear(req.query.thang, 1, 12, now.getMonth() + 1);
  const nam = parseMonthYear(req.query.nam, 2000, 3000, now.getFullYear());

  const range = {
    $gte: new Date(nam, thang - 1, 1),
    $lt: new Date(nam, thang, 1),
  };

  const [phongBan, chucVu, trinhDo, attendanceRows, allYears] =
    await Promise.all([
      employee.MaPhongBan
        ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
        : null,
      employee.MaChucVu
        ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
        : null,
      employee.MaTrinhDo
        ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
        : null,
      ChamCong.find({
        MaNhanVien: employee.MaNhanVien,
        NgayCong: range,
      })
        .sort({ NgayCong: 1, MaChamCong: 1 })
        .lean(),
      ChamCong.find({ MaNhanVien: employee.MaNhanVien })
        .select({ NgayCong: 1, _id: 0 })
        .lean(),
    ]);

  const { calendarDays, rows } = buildMonthlyAttendanceRows(
    [
      {
        MaNhanVien: employee.MaNhanVien,
        HoTen: employee.HoTen,
        TenPhongBan: phongBan?.TenPhongBan || "",
      },
    ],
    attendanceRows,
    thang,
    nam,
  );

  const matrixRow = rows[0];
  const totalDays = calendarDays.length;
  const totalPresent = matrixRow?.totalPresent || 0;
  const totalOff = Math.max(totalDays - totalPresent, 0);
  const markedDayMap = new Map();

  attendanceRows.forEach((row) => {
    const date = new Date(row.NgayCong);
    if (Number.isNaN(date.getTime())) return;

    const day = date.getDate();
    const status = normalizeAttendanceStatus(row.TrangThai_ChamCong || "");
    markedDayMap.set(day, {
      day,
      statusLabel: status.label,
      className: status.className,
      checkInTimeText: formatCheckInTime(row.ThoiDiemCheckIn),
    });
  });

  const markedDays = [...markedDayMap.values()].sort((a, b) => a.day - b.day);

  const yearOptions = [
    ...new Set(
      allYears
        .map((x) => new Date(x.NgayCong).getFullYear())
        .filter((x) => Number.isInteger(x) && x > 1900),
    ),
  ].sort((a, b) => b - a);

  return res.render("user/attendance", {
    title: "Bảng chấm công",
    activeMenu: "bangcong",
    employee: {
      ...employee,
      TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
      TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
      TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
    },
    calendarDays,
    matrixRows: rows,
    summary: {
      totalDays,
      totalPresent,
      totalOff,
    },
    markedDays,
    filters: {
      thang,
      nam,
    },
    yearOptions: yearOptions.length ? yearOptions : [nam],
  });
});

router.get("/cham-cong/tram", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const now = new Date();
  const employee = await resolveEmployee(maNhanVien);
  const currentPeriod = await ensureCurrentAttendancePeriod();
  const currentPeriodOpen = String(currentPeriod?.TrangThaiKy || "") === "Mở";

  if (!employee) {
    return res.render("user/checkin", {
      title: "Trạm chấm công",
      activeMenu: "chamcong",
      employee: null,
      todayAttendance: null,
      checkInNotice: String(req.query.notice || "").trim(),
      stationInfo: {
        longDateLabel: formatLongDate(now),
        currentTime: formatCurrentTime(now),
        expectedCheckIn: CHECK_IN_WINDOW.label,
        canCheckIn: isWithinCheckInWindow(now),
        periodLabel: `${currentPeriod.Thang}/${currentPeriod.Nam}`,
        periodStatus: currentPeriod.TrangThaiKy,
        periodIsOpen: currentPeriodOpen,
        office: OFFICE_LOCATION,
        maxDistanceMeters: CHECK_IN_MAX_DISTANCE_METERS,
      },
    });
  }

  const dayRange = getDayRange(now);

  const [phongBan, chucVu, trinhDo, todayAttendance] = await Promise.all([
    employee.MaPhongBan
      ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
      : null,
    employee.MaChucVu
      ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
      : null,
    employee.MaTrinhDo
      ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
      : null,
    ChamCong.findOne({
      MaNhanVien: employee.MaNhanVien,
      NgayCong: { $gte: dayRange.start, $lte: dayRange.end },
    }).lean(),
  ]);

  const todayStatus = todayAttendance
    ? normalizeAttendanceStatus(todayAttendance.TrangThai_ChamCong || "")
    : null;

  const checkInDistanceText = Number.isFinite(todayAttendance?.KhoangCachMet)
    ? `${new Intl.NumberFormat("vi-VN").format(todayAttendance.KhoangCachMet)} m`
    : "Không xác định";

  const checkInTimeText = todayAttendance?.ThoiDiemCheckIn
    ? new Date(todayAttendance.ThoiDiemCheckIn).toLocaleTimeString("vi-VN", {
        hour12: false,
      })
    : "--:--";

  return res.render("user/checkin", {
    title: "Trạm chấm công",
    activeMenu: "chamcong",
    employee: {
      ...employee,
      TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
      TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
      TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
    },
    todayAttendance: todayStatus
      ? {
          ...todayStatus,
          checkInAddress: todayAttendance?.DiaDiemCheckIn || "Chưa có vị trí",
          checkInDistanceText,
          checkInTimeText,
          latitude: todayAttendance?.ViDo,
          longitude: todayAttendance?.KinhDo,
        }
      : null,
    checkInNotice: String(req.query.notice || "").trim(),
    stationInfo: {
      longDateLabel: formatLongDate(now),
      currentTime: formatCurrentTime(now),
      expectedCheckIn: CHECK_IN_WINDOW.label,
      canCheckIn: isWithinCheckInWindow(now),
      periodLabel: `${currentPeriod.Thang}/${currentPeriod.Nam}`,
      periodStatus: currentPeriod.TrangThaiKy,
      periodIsOpen: currentPeriodOpen,
      office: OFFICE_LOCATION,
      maxDistanceMeters: CHECK_IN_MAX_DISTANCE_METERS,
    },
  });
});

router.post("/cham-cong/xac-nhan", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const now = new Date();
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.redirect(
      "/user/cham-cong/tram?notice=Khong+tim+thay+du+lieu+nhan+vien",
    );
  }

  if (!isWithinCheckInWindow(now)) {
    return res.redirect(
      "/user/cham-cong/tram?notice=Chi+duoc+cham+cong+trong+khung+gio+08:00-17:00",
    );
  }

  const thang = now.getMonth() + 1;
  const nam = now.getFullYear();
  const periodOpen = await isAttendancePeriodOpen(thang, nam);
  if (!periodOpen) {
    return res.redirect(
      "/user/cham-cong/tram?notice=Ky+cham+cong+hien+tai+da+bi+khoa%2C+khong+the+check-in",
    );
  }

  const dayRange = getDayRange(now);
  const latitude = parseCoordinateInput(req.body.latitude, -90, 90);
  const longitude = parseCoordinateInput(req.body.longitude, -180, 180);

  if (latitude === null || longitude === null) {
    return res.redirect(
      "/user/cham-cong/tram?notice=Vui+long+bat+dinh+vi+de+cham+cong",
    );
  }

  const address = String(req.body.address || "").trim();
  const distanceMeters = distanceInMeters(
    latitude,
    longitude,
    OFFICE_LOCATION.lat,
    OFFICE_LOCATION.lng,
  );

  if (distanceMeters > CHECK_IN_MAX_DISTANCE_METERS) {
    return res.redirect(
      `/user/cham-cong/tram?notice=Ban+can+o+trong+pham+vi+${CHECK_IN_MAX_DISTANCE_METERS}m+quanh+tru+so+de+check-in`,
    );
  }

  const checkInAddress =
    address || `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;

  const existing = await ChamCong.findOne({
    MaNhanVien: employee.MaNhanVien,
    NgayCong: { $gte: dayRange.start, $lte: dayRange.end },
  });

  if (existing) {
    const normalized = normalizeText(existing.TrangThai_ChamCong);
    if (/di\s*lam|co\s*cong|present/.test(normalized)) {
      existing.ViDo = latitude;
      existing.KinhDo = longitude;
      existing.DiaDiemCheckIn = checkInAddress;
      existing.KhoangCachMet = distanceMeters;
      existing.ThoiDiemCheckIn = now;
      await existing.save();
      await syncPayrollAttendanceSnapshot(employee.MaNhanVien, now);
      return res.redirect(
        "/user/cham-cong/tram?notice=Ban+da+xac+nhan+di+lam+hom+nay+va+da+cap+nhat+vi+tri",
      );
    }

    existing.TrangThai_ChamCong = "Di lam";
    existing.ViDo = latitude;
    existing.KinhDo = longitude;
    existing.DiaDiemCheckIn = checkInAddress;
    existing.KhoangCachMet = distanceMeters;
    existing.ThoiDiemCheckIn = now;
    await existing.save();
    await syncPayrollAttendanceSnapshot(employee.MaNhanVien, now);
    return res.redirect(
      "/user/cham-cong/tram?notice=Xac+nhan+di+lam+thanh+cong",
    );
  }

  const dayKey = now.toISOString().slice(0, 10).replace(/-/g, "");
  await ChamCong.create({
    MaChamCong: `CC-${employee.MaNhanVien}-${dayKey}`,
    MaNhanVien: employee.MaNhanVien,
    NgayCong: new Date(),
    TrangThai_ChamCong: "Di lam",
    ViDo: latitude,
    KinhDo: longitude,
    DiaDiemCheckIn: checkInAddress,
    KhoangCachMet: distanceMeters,
    ThoiDiemCheckIn: now,
  });

  await syncPayrollAttendanceSnapshot(employee.MaNhanVien, now);

  return res.redirect("/user/cham-cong/tram?notice=Xac+nhan+di+lam+thanh+cong");
});

router.get("/bang-luong", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const now = new Date();
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.render("user/salary", {
      title: "Bảng lương cá nhân",
      activeMenu: "bangluong",
      employee: null,
      rows: [],
      dailyRows: [],
      dailySummary: {
        totalWorkHours: 0,
        totalOtHours: 0,
        totalGross: "0 đ",
      },
      summary: {
        totalMonths: 0,
        monthWorkingDays: 0,
        totalBonus: "0 đ",
        totalDeduction: "0 đ",
        totalNet: "0 đ",
      },
      filters: {
        thang: now.getMonth() + 1,
        nam: now.getFullYear(),
      },
      yearOptions: [now.getFullYear()],
      hasContractFields: false,
    });
  }

  const thangRaw =
    req.query.thang !== undefined ? req.query.thang : req.query.month;
  const namRaw = req.query.nam !== undefined ? req.query.nam : req.query.year;

  const thang = parseMonthYear(thangRaw, 1, 12, now.getMonth() + 1);
  const nam = parseMonthYear(namRaw, 2000, 3000, now.getFullYear());
  const isFuturePeriod =
    nam > now.getFullYear() ||
    (nam === now.getFullYear() && thang > now.getMonth() + 1);

  const [
    phongBan,
    chucVu,
    trinhDo,
    contracts,
    luongRows,
    luongYears,
    attendanceMonthRows,
    attendanceYearRows,
  ] = await Promise.all([
    employee.MaPhongBan
      ? PhongBan.findOne({ MaPhongBan: employee.MaPhongBan }).lean()
      : null,
    employee.MaChucVu
      ? ChucVu.findOne({ MaChucVu: employee.MaChucVu }).lean()
      : null,
    employee.MaTrinhDo
      ? TrinhDo.findOne({ MaTrinhDo: employee.MaTrinhDo }).lean()
      : null,
    HopDong.find({ MaNhanVien: employee.MaNhanVien })
      .sort({ NgayBatDau: -1, MaHopDong: -1 })
      .lean(),
    isFuturePeriod
      ? []
      : LuongNhanVien.find({
          MaNhanVien: employee.MaNhanVien,
          Nam: nam,
          Thang: thang,
        })
          .sort({ Nam: -1, Thang: -1, MaBangLuong: 1 })
          .lean(),
    LuongNhanVien.find({ MaNhanVien: employee.MaNhanVien })
      .select({ Nam: 1, _id: 0 })
      .lean(),
    ChamCong.find({
      MaNhanVien: employee.MaNhanVien,
      NgayCong: {
        $gte: new Date(nam, thang - 1, 1),
        $lt: new Date(nam, thang, 1),
      },
    })
      .select({
        NgayCong: 1,
        TrangThai_ChamCong: 1,
        ThoiDiemCheckIn: 1,
        _id: 0,
      })
      .sort({ NgayCong: 1 })
      .lean(),
    ChamCong.find({ MaNhanVien: employee.MaNhanVien })
      .select({ NgayCong: 1, _id: 0 })
      .lean(),
  ]);

  const hasContractFields = Boolean(contracts.length);
  const selectedContract = pickEffectiveContract(contracts, thang, nam);
  const attendanceByMonth = summarizeAttendanceByMonth(attendanceMonthRows);
  const attendanceSummary = attendanceByMonth[`${nam}-${thang}`] || {
    soNgayCong: 0,
    tongGioCong: 0,
    tongGioOT: 0,
  };

  const tongThuong = luongRows.reduce(
    (sum, row) => sum + Number(row.Thuong || 0),
    0,
  );
  const tongKhauTru = luongRows.reduce(
    (sum, row) => sum + Number(row.KhauTru || 0),
    0,
  );
  const payroll = calculatePayrollForMonth({
    salaryRow: {
      SoNgayCong: attendanceSummary.soNgayCong,
      TongGioCong: attendanceSummary.tongGioCong,
      TongGioOT: attendanceSummary.tongGioOT,
      SuDungDuLieuCongTay: false,
      Thuong: tongThuong,
      KhauTru: tongKhauTru,
    },
    contract: selectedContract,
    attendanceSummary,
    heSoOT: 1.5,
    thamGiaBHXH: false,
  });

  const rows = isFuturePeriod
    ? []
    : [
        {
          MaBangLuong:
            luongRows[0]?.MaBangLuong ||
            `AUTO-${employee.MaNhanVien}-${thang}-${nam}`,
          ThangNam: `${thang}/${nam}`,
          SoNgayCong: payroll.soNgayCong,
          TongGioCong: payroll.tongGioCong,
          TongGioOT: payroll.tongGioOT,
          LuongChinh: toCurrency(payroll.luongChinh),
          LuongOT: toCurrency(payroll.luongOT),
          PhuCap: toCurrency(payroll.tongPhuCap),
          Thuong: toCurrency(payroll.tongThuong),
          KhauTru: toCurrency(payroll.khauTruKhac),
          TongThuNhap: toCurrency(payroll.tongThuNhap),
          TongKhauTru: toCurrency(payroll.tongKhauTru),
          ThucNhan: toCurrency(payroll.tongLuongThucLinh),
          _bonusRaw: payroll.tongThuong,
          _deductionRaw: payroll.tongKhauTru,
          _netRaw: payroll.tongLuongThucLinh,
        },
      ];

  const dailyRows = isFuturePeriod
    ? []
    : buildDailyPayrollRows(attendanceMonthRows, selectedContract, 1.5);

  const dailySummaryRaw = dailyRows.reduce(
    (acc, row) => {
      acc.totalWorkHours += row.workHours;
      acc.totalOtHours += row.otHours;
      acc.totalGross += row.tongLuongNgay;
      return acc;
    },
    { totalWorkHours: 0, totalOtHours: 0, totalGross: 0 },
  );

  const luongCoBan =
    (selectedContract?.MucLuong || 0) * (selectedContract?.HeSoLuong || 1);
  const phuCap = selectedContract?.PhuCapCoDinh || 0;

  const totalBonusRaw = rows.reduce((sum, x) => sum + x._bonusRaw, 0);
  const totalDeductionRaw = rows.reduce((sum, x) => sum + x._deductionRaw, 0);
  const totalNetRaw = rows.reduce((sum, x) => sum + x._netRaw, 0);
  const monthWorkingDays = attendanceSummary.soNgayCong || 0;

  const yearOptions = [
    ...new Set([
      now.getFullYear(),
      ...luongYears.map((x) => x.Nam).filter(Boolean),
      ...attendanceYearRows
        .map((x) => {
          const date = new Date(x.NgayCong);
          return Number.isNaN(date.getTime()) ? null : date.getFullYear();
        })
        .filter(Boolean),
    ]),
  ].sort((a, b) => b - a);

  return res.render("user/salary", {
    title: "Bảng lương cá nhân",
    activeMenu: "bangluong",
    employee: {
      ...employee,
      TenPhongBan: phongBan?.TenPhongBan || "Chưa cập nhật",
      TenChucVu: chucVu?.TenChucVu || "Chưa cập nhật",
      TenTrinhDo: trinhDo?.TenTrinhDo || "Chưa cập nhật",
    },
    rows,
    dailyRows,
    dailySummary: {
      totalWorkHours: dailySummaryRaw.totalWorkHours,
      totalOtHours: dailySummaryRaw.totalOtHours,
      totalGross: toCurrency(dailySummaryRaw.totalGross),
    },
    contractInfo: hasContractFields
      ? {
          MaHopDong: selectedContract?.MaHopDong || "--",
          LoaiHopDong: selectedContract?.LoaiHopDong || "Chưa cập nhật",
          TrangThai_HopDong:
            selectedContract?.TrangThai_HopDong || "Chưa cập nhật",
          LuongCoBan: toCurrency(luongCoBan),
          PhuCap: toCurrency(phuCap),
        }
      : null,
    summary: {
      totalMonths: rows.length,
      monthWorkingDays,
      totalBonus: toCurrency(totalBonusRaw),
      totalDeduction: toCurrency(totalDeductionRaw),
      totalNet: toCurrency(totalNetRaw),
    },
    filters: {
      thang,
      nam,
    },
    yearOptions: yearOptions.length ? yearOptions : [nam],
    hasContractFields,
  });
});

router.get("/thongbao", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const employee = await resolveEmployee(maNhanVien);
  const notifications = await getDailyNewsItems(20);

  res.render("user/notifications", {
    title: "Thông báo mới nhất",
    activeMenu: "thongbao",
    employee,
    notifications,
  });
});

router.get("/xin-nghi", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const employee = await resolveEmployee(maNhanVien);

  if (!employee) {
    return res.render("user/leave-request", {
      title: "Xin nghỉ online",
      activeMenu: "nghiphep",
      employee: null,
      leaveRows: [],
      flash: buildLeaveRequestFlash(req.query.status, req.query.message),
      todayDate: new Date().toISOString().slice(0, 10),
    });
  }

  const [employeeView, leaveRowsRaw] = await Promise.all([
    buildEmployeeView(employee),
    DonXinNghi.find({ MaNhanVien: employee.MaNhanVien })
      .sort({ NgayTao: -1, MaDonNghi: -1 })
      .lean(),
  ]);

  const leaveRows = leaveRowsRaw.map((row) => {
    const status = normalizeLeaveStatus(row.TrangThaiDon || "");
    return {
      ...row,
      TuNgayText: row.TuNgay ? formatDate(row.TuNgay) : "--",
      DenNgayText: row.DenNgay ? formatDate(row.DenNgay) : "--",
      NgayTaoText: row.NgayTao ? formatDate(row.NgayTao) : "--",
      NgayCapNhatText: row.NgayCapNhat ? formatDate(row.NgayCapNhat) : "--",
      StatusLabel: status.label,
      StatusClassName: status.className,
    };
  });

  return res.render("user/leave-request", {
    title: "Xin nghỉ online",
    activeMenu: "nghiphep",
    employee: employeeView,
    leaveRows,
    flash: buildLeaveRequestFlash(req.query.status, req.query.message),
    todayDate: new Date().toISOString().slice(0, 10),
  });
});

router.post("/xin-nghi", async (req, res) => {
  const maNhanVien = String(req.session?.user?.maNhanVien || "").trim();
  if (!maNhanVien) {
    return res.redirect(
      "/user/xin-nghi?status=error&message=Khong+xac+dinh+duoc+nhan+vien",
    );
  }

  const employee = await resolveEmployee(maNhanVien);
  if (!employee) {
    return res.redirect(
      "/user/xin-nghi?status=error&message=Khong+tim+thay+ho+so+nhan+vien",
    );
  }

  const tuNgayRaw = String(req.body.tuNgay || "").trim();
  const denNgayRaw = String(req.body.denNgay || "").trim();
  const loaiNghiRaw = String(req.body.loaiNghi || "Nghi phep").trim();
  const lyDo = String(req.body.lyDo || "").trim();

  if (!tuNgayRaw || !denNgayRaw || !lyDo) {
    return res.redirect(
      "/user/xin-nghi?status=error&message=Vui+long+nhap+day+du+tu+ngay%2C+den+ngay+va+ly+do",
    );
  }

  const tuNgay = new Date(tuNgayRaw);
  const denNgay = new Date(denNgayRaw);
  if (Number.isNaN(tuNgay.getTime()) || Number.isNaN(denNgay.getTime())) {
    return res.redirect(
      "/user/xin-nghi?status=error&message=Ngay+xin+nghi+khong+hop+le",
    );
  }

  tuNgay.setHours(0, 0, 0, 0);
  denNgay.setHours(0, 0, 0, 0);
  if (denNgay < tuNgay) {
    return res.redirect(
      "/user/xin-nghi?status=error&message=Den+ngay+khong+duoc+nho+hon+tu+ngay",
    );
  }

  const loaiNghi = [
    "Nghi phep",
    "Nghi om",
    "Nghi khong luong",
    "Khac",
  ].includes(loaiNghiRaw)
    ? loaiNghiRaw
    : "Khac";

  const maDonNghi = await generateLeaveRequestCode(employee.MaNhanVien);

  await DonXinNghi.create({
    MaDonNghi: maDonNghi,
    MaNhanVien: employee.MaNhanVien,
    TuNgay: tuNgay,
    DenNgay: denNgay,
    LoaiNghi: loaiNghi,
    LyDo: lyDo,
    TrangThaiDon: "Cho duyet",
    NgayTao: new Date(),
    NgayCapNhat: new Date(),
  });

  return res.redirect(
    "/user/xin-nghi?status=success&message=Gui+don+xin+nghi+thanh+cong",
  );
});

router.get("/doi-mat-khau", async (req, res) => {
  const maNhanVien = req.session?.user?.maNhanVien || "";
  const employee = await resolveEmployee(maNhanVien);

  return res.render("user/change-password", {
    title: "Đổi mật khẩu tài khoản",
    activeMenu: "doimatkhau",
    employee,
    flash: buildPasswordChangeViewModel(req.query.status, req.query.message),
  });
});

router.post("/doi-mat-khau", async (req, res) => {
  const tenDangNhap = String(req.session?.user?.tenDangNhap || "").trim();
  if (!tenDangNhap) {
    return res.redirect(
      "/user/doi-mat-khau?status=error&message=Khong+xac+dinh+tai+khoan+dang+nhap",
    );
  }

  const matKhauCu = String(req.body.matKhauCu || "").trim();
  const matKhauMoi = String(req.body.matKhauMoi || "").trim();
  const xacNhanMatKhauMoi = String(req.body.xacNhanMatKhauMoi || "").trim();

  if (!matKhauCu || !matKhauMoi || !xacNhanMatKhauMoi) {
    return res.redirect(
      "/user/doi-mat-khau?status=error&message=Vui+long+nhap+day+du+mat+khau+cu%2C+mat+khau+moi+va+xac+nhan",
    );
  }

  if (matKhauCu === matKhauMoi) {
    return res.redirect(
      "/user/doi-mat-khau?status=error&message=Mat+khau+moi+khong+duoc+trung+mat+khau+hien+tai",
    );
  }

  if (matKhauMoi !== xacNhanMatKhauMoi) {
    return res.redirect(
      "/user/doi-mat-khau?status=error&message=Xac+nhan+mat+khau+moi+khong+khop",
    );
  }

  const account = await TaiKhoan.findOne({
    TenDangNhap: { $regex: `^${tenDangNhap}$`, $options: "i" },
  });

  if (!account) {
    return res.redirect(
      "/user/doi-mat-khau?status=error&message=Khong+tim+thay+tai+khoan",
    );
  }

  const isCurrentPasswordValid = await account.verifyPassword(matKhauCu);
  if (!isCurrentPasswordValid) {
    return res.redirect(
      "/user/doi-mat-khau?status=error&message=Mat+khau+cu+khong+dung",
    );
  }

  account.MatKhau = matKhauMoi;
  await account.save();

  return res.redirect(
    "/user/doi-mat-khau?status=success&message=Doi+mat+khau+thanh+cong",
  );
});

router.get("/api/thongbao", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const notifications = await getDailyNewsItems(
      Number.isNaN(limit) ? 10 : limit,
    );
    res.json({
      count: notifications.length,
      items: notifications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy thông báo",
      error: error.message,
    });
  }
});

module.exports = router;
