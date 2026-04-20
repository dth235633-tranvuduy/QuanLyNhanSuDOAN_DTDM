const KyChamCongThang = require("../models/KyChamCongThang");

async function ensureAttendancePeriod(thang, nam) {
  const month = Number(thang);
  const year = Number(nam);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Thang khong hop le");
  }

  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Nam khong hop le");
  }

  const now = new Date();
  const period = await KyChamCongThang.findOneAndUpdate(
    { Thang: month, Nam: year },
    {
      $setOnInsert: {
        TrangThaiKy: "Mở",
        MoLuc: now,
      },
    },
    {
      new: true,
      upsert: true,
    },
  ).lean();

  return period;
}

async function ensureCurrentAttendancePeriod() {
  const now = new Date();
  return ensureAttendancePeriod(now.getMonth() + 1, now.getFullYear());
}

async function isAttendancePeriodOpen(thang, nam) {
  const period = await ensureAttendancePeriod(thang, nam);
  return String(period?.TrangThaiKy || "") === "Mở";
}

module.exports = {
  ensureAttendancePeriod,
  ensureCurrentAttendancePeriod,
  isAttendancePeriodOpen,
};
