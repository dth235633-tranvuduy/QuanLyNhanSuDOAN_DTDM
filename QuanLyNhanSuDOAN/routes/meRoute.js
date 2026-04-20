const express = require("express");
const NhanVien = require("../models/NhanVien");
const ChamCong = require("../models/ChamCong");
const HopDong = require("../models/HopDong");
const LuongNhanVien = require("../models/LuongNhanVien");

const router = express.Router();

function toPositiveInt(
  value,
  fallback,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {},
) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

function parseMonthYearFilters(req) {
  const thangRaw = String(req.query.thang || "").trim();
  const namRaw = String(req.query.nam || "").trim();

  if (thangRaw && !namRaw) {
    return {
      error: "Bo loc thang can di kem nam",
    };
  }

  let thang;
  let nam;

  if (thangRaw) {
    thang = Number.parseInt(thangRaw, 10);
    if (!Number.isInteger(thang) || thang < 1 || thang > 12) {
      return {
        error: "Thang khong hop le",
      };
    }
  }

  if (namRaw) {
    nam = Number.parseInt(namRaw, 10);
    if (!Number.isInteger(nam) || nam < 1900 || nam > 3000) {
      return {
        error: "Nam khong hop le",
      };
    }
  }

  return {
    thang,
    nam,
  };
}

function getEmployeeCode(req) {
  const user = req.session?.user;
  if (!user) {
    return "";
  }

  if (user.role === "admin") {
    return String(req.query.maNhanVien || user.maNhanVien || "")
      .trim()
      .toUpperCase();
  }

  return String(user.maNhanVien || "")
    .trim()
    .toUpperCase();
}

function ensureEmployeeCode(req, res) {
  const maNhanVien = getEmployeeCode(req);
  if (!maNhanVien) {
    res.status(400).json({
      message: "Can cung cap maNhanVien hop le",
    });
    return null;
  }
  return maNhanVien;
}

router.get("/profile", async (req, res) => {
  try {
    const maNhanVien = ensureEmployeeCode(req, res);
    if (!maNhanVien) {
      return undefined;
    }

    const profile = await NhanVien.findOne({ MaNhanVien: maNhanVien }).lean();

    if (!profile) {
      return res
        .status(404)
        .json({ message: "Khong tim thay ho so nhan vien" });
    }

    return res.json(profile);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi lay ho so", error: error.message });
  }
});

router.get("/chamcong", async (req, res) => {
  try {
    const maNhanVien = ensureEmployeeCode(req, res);
    if (!maNhanVien) {
      return undefined;
    }

    const filters = parseMonthYearFilters(req);
    if (filters.error) {
      return res.status(400).json({ message: filters.error });
    }

    const page = toPositiveInt(req.query.page, 1, { min: 1 });
    const limit = toPositiveInt(req.query.limit, 10, { min: 1, max: 100 });
    const skip = (page - 1) * limit;

    const query = { MaNhanVien: maNhanVien };
    if (filters.nam && filters.thang) {
      query.NgayCong = {
        $gte: new Date(filters.nam, filters.thang - 1, 1),
        $lt: new Date(filters.nam, filters.thang, 1),
      };
    } else if (filters.nam) {
      query.NgayCong = {
        $gte: new Date(filters.nam, 0, 1),
        $lt: new Date(filters.nam + 1, 0, 1),
      };
    }

    const totalItems = await ChamCong.countDocuments(query);
    const items = await ChamCong.find(query)
      .sort({ NgayCong: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      filters: {
        thang: filters.thang || null,
        nam: filters.nam || null,
      },
      items,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi lay cham cong", error: error.message });
  }
});

router.get("/hopdong", async (req, res) => {
  try {
    const maNhanVien = ensureEmployeeCode(req, res);
    if (!maNhanVien) {
      return undefined;
    }

    const items = await HopDong.find({ MaNhanVien: maNhanVien })
      .sort({ NgayBatDau: -1 })
      .lean();

    return res.json(items);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi lay hop dong", error: error.message });
  }
});

router.get("/luong", async (req, res) => {
  try {
    const maNhanVien = ensureEmployeeCode(req, res);
    if (!maNhanVien) {
      return undefined;
    }

    const filters = parseMonthYearFilters(req);
    if (filters.error) {
      return res.status(400).json({ message: filters.error });
    }

    const page = toPositiveInt(req.query.page, 1, { min: 1 });
    const limit = toPositiveInt(req.query.limit, 10, { min: 1, max: 100 });
    const skip = (page - 1) * limit;

    const query = { MaNhanVien: maNhanVien };
    if (filters.thang) {
      query.Thang = filters.thang;
    }
    if (filters.nam) {
      query.Nam = filters.nam;
    }

    const totalItems = await LuongNhanVien.countDocuments(query);
    const items = await LuongNhanVien.find(query)
      .sort({ Nam: -1, Thang: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      filters: {
        thang: filters.thang || null,
        nam: filters.nam || null,
      },
      items,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi lay bang luong", error: error.message });
  }
});

module.exports = router;
