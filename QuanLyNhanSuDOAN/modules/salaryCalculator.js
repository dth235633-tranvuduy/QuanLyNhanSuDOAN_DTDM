function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseFlexibleNumber(rawValue, fallback = 0) {
  const normalized = String(rawValue ?? "")
    .trim()
    .replace(/,/g, ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

function extractHourHintsFromStatus(status = "") {
  const normalized = normalizeText(status);
  let workHours = 0;
  let otHours = 0;

  if (/nghi\s*phep|vang|nghi|off|absent/.test(normalized)) {
    return { workHours, otHours, isPresent: false };
  }

  const isPresent = /di\s*lam|co\s*cong|present|work/.test(normalized);
  if (isPresent) {
    workHours = 8;
  }

  const explicitHourMatches = [
    ...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(gio|h)/g),
  ];
  if (explicitHourMatches.length) {
    const totalMatchedHours = explicitHourMatches.reduce(
      (sum, match) => sum + parseFlexibleNumber(match[1], 0),
      0,
    );

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

function summarizeAttendanceByMonth(attendanceRows = []) {
  return attendanceRows.reduce((acc, row) => {
    const date = new Date(row.NgayCong);
    if (Number.isNaN(date.getTime())) return acc;

    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const key = `${year}-${month}`;

    if (!acc[key]) {
      acc[key] = {
        soNgayCong: 0,
        tongGioCong: 0,
        tongGioOT: 0,
      };
    }

    const status = row.TrangThai_ChamCong || "";
    const { workHours, otHours, isPresent } =
      extractHourHintsFromStatus(status);

    acc[key].tongGioCong += workHours;
    acc[key].tongGioOT += otHours;
    if (isPresent || workHours > 0) {
      acc[key].soNgayCong += 1;
    }

    return acc;
  }, {});
}

function pickEffectiveContract(contracts = [], month, year) {
  if (!contracts.length) return null;

  const fromDate = new Date(year, month - 1, 1);
  const toDate = new Date(year, month, 0, 23, 59, 59, 999);

  const inRangeContracts = contracts.filter((contract) => {
    const startDate = contract.NgayBatDau
      ? new Date(contract.NgayBatDau)
      : null;
    const endDate = contract.NgayKetThuc
      ? new Date(contract.NgayKetThuc)
      : null;

    const startsBeforePeriodEnd = !startDate || startDate <= toDate;
    const endsAfterPeriodStart = !endDate || endDate >= fromDate;

    return startsBeforePeriodEnd && endsAfterPeriodStart;
  });

  const activeContracts = inRangeContracts.filter((contract) =>
    /con\s*hieu\s*luc|hieu\s*luc|active/.test(
      normalizeText(contract.TrangThai_HopDong),
    ),
  );

  const pool = activeContracts.length ? activeContracts : inRangeContracts;
  if (!pool.length) return contracts[0] || null;

  return [...pool].sort((a, b) => {
    const dateA = a.NgayBatDau ? new Date(a.NgayBatDau).getTime() : 0;
    const dateB = b.NgayBatDau ? new Date(b.NgayBatDau).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return String(b.MaHopDong || "").localeCompare(String(a.MaHopDong || ""));
  })[0];
}

function calculatePayrollForMonth({
  salaryRow,
  contract,
  attendanceSummary,
  heSoOT = 1.5,
  thamGiaBHXH = false,
}) {
  const safeSalaryRow = salaryRow || {};
  const safeContract = contract || {};
  const attendance = attendanceSummary || {};
  const manualAttendanceEnabled = Boolean(safeSalaryRow.SuDungDuLieuCongTay);

  const luongCoBan =
    (safeContract.MucLuong || 0) * (safeContract.HeSoLuong || 1);
  const gioCongChuanThang =
    safeContract.SoGioCong > 0 ? safeContract.SoGioCong : 26 * 8;
  const tongGioCong = manualAttendanceEnabled
    ? Number(safeSalaryRow.TongGioCong || 0)
    : Number(attendance.tongGioCong || 0);
  const tongGioOT = manualAttendanceEnabled
    ? Number(safeSalaryRow.TongGioOT || 0)
    : Number(attendance.tongGioOT || 0);
  const soNgayCong = manualAttendanceEnabled
    ? Number(safeSalaryRow.SoNgayCong || 0)
    : Number(attendance.soNgayCong || safeSalaryRow.SoNgayCong || 0);

  const donGiaGioCong =
    gioCongChuanThang > 0 ? luongCoBan / gioCongChuanThang : 0;
  const luongChinh = Math.round(donGiaGioCong * tongGioCong);
  const luongOT = Math.round(donGiaGioCong * tongGioOT * heSoOT);

  const tongPhuCap = safeContract.PhuCapCoDinh || 0;
  const tongThuong = safeSalaryRow.Thuong || 0;
  const khauTruKhac = safeSalaryRow.KhauTru || 0;

  const luongDongBaoHiem = safeContract.MucLuong || 0;
  const baoHiemNhanVien = thamGiaBHXH
    ? Math.round(luongDongBaoHiem * (0.08 + 0.015 + 0.01))
    : 0;

  const thueTNCN = 0;

  const tongThuNhap = luongChinh + luongOT + tongPhuCap + tongThuong;
  const tongKhauTru = thueTNCN + baoHiemNhanVien + khauTruKhac;
  const tongLuongThucLinh = Math.max(tongThuNhap - tongKhauTru, 0);

  return {
    soNgayCong,
    tongGioCong,
    tongGioOT,
    luongCoBan,
    gioCongChuanThang,
    donGiaGioCong,
    luongChinh,
    luongOT,
    tongPhuCap,
    tongThuong,
    khauTruKhac,
    thueTNCN,
    baoHiemNhanVien,
    tongThuNhap,
    tongKhauTru,
    tongLuongThucLinh,
  };
}

module.exports = {
  summarizeAttendanceByMonth,
  pickEffectiveContract,
  calculatePayrollForMonth,
};
