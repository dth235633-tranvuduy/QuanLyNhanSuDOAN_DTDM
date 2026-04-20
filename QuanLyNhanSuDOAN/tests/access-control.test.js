const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

const { requireRole } = require("../middlewares/auth");
const meRoute = require("../routes/meRoute");
const NhanVien = require("../models/NhanVien");
const ChamCong = require("../models/ChamCong");
const HopDong = require("../models/HopDong");
const LuongNhanVien = require("../models/LuongNhanVien");

const originalMethods = {
  nhanVienFindOne: NhanVien.findOne,
  chamCongCount: ChamCong.countDocuments,
  chamCongFind: ChamCong.find,
  hopDongFind: HopDong.find,
  luongCount: LuongNhanVien.countDocuments,
  luongFind: LuongNhanVien.find,
};

let lastChamCongQuery = null;
let lastLuongQuery = null;

function makeChain(items, tracker) {
  const chain = {
    sort() {
      return chain;
    },
    skip(value) {
      tracker.skip = value;
      return chain;
    },
    limit(value) {
      tracker.limit = value;
      return chain;
    },
    async lean() {
      return items;
    },
  };

  return chain;
}

function createTestApp() {
  const app = express();

  app.use((req, _res, next) => {
    const role = req.header("x-test-role");
    const maNhanVien = req.header("x-test-manv") || "";

    req.session = role
      ? {
          user: {
            role,
            maNhanVien,
            tenDangNhap: role,
            hoTen: "Test User",
          },
        }
      : {};

    next();
  });

  app.use("/api/me", requireRole("nhanvien", "admin"), meRoute);
  app.get("/api/admin-only", requireRole("admin"), (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

function mockModels() {
  NhanVien.findOne = (query) => ({
    async lean() {
      if (query.MaNhanVien === "NV404") {
        return null;
      }

      return {
        MaNhanVien: query.MaNhanVien,
        HoTen: "Nhan Vien Test",
      };
    },
  });

  ChamCong.countDocuments = async (query) => {
    lastChamCongQuery = query;
    return 25;
  };

  ChamCong.find = (query) => {
    lastChamCongQuery = query;
    return makeChain([{ MaChamCong: "CC001", MaNhanVien: query.MaNhanVien }], {
      skip: 0,
      limit: 0,
    });
  };

  HopDong.find = (query) => ({
    sort() {
      return this;
    },
    async lean() {
      return [{ MaHopDong: "HD001", MaNhanVien: query.MaNhanVien }];
    },
  });

  LuongNhanVien.countDocuments = async (query) => {
    lastLuongQuery = query;
    return 12;
  };

  LuongNhanVien.find = (query) => {
    lastLuongQuery = query;
    return makeChain(
      [
        {
          MaBangLuong: "BL001",
          MaNhanVien: query.MaNhanVien,
          Thang: 4,
          Nam: 2026,
        },
      ],
      { skip: 0, limit: 0 },
    );
  };
}

function restoreModels() {
  NhanVien.findOne = originalMethods.nhanVienFindOne;
  ChamCong.countDocuments = originalMethods.chamCongCount;
  ChamCong.find = originalMethods.chamCongFind;
  HopDong.find = originalMethods.hopDongFind;
  LuongNhanVien.countDocuments = originalMethods.luongCount;
  LuongNhanVien.find = originalMethods.luongFind;
}

test.before(() => {
  mockModels();
});

test.after(() => {
  restoreModels();
});

test("API /api/me/profile yeu cau dang nhap", async () => {
  const app = createTestApp();
  const response = await request(app).get("/api/me/profile");

  assert.equal(response.status, 401);
});

test("Nhan vien xem duoc profile cua chinh minh", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/me/profile")
    .set("x-test-role", "nhanvien")
    .set("x-test-manv", "NV001");

  assert.equal(response.status, 200);
  assert.equal(response.body.MaNhanVien, "NV001");
});

test("Admin goi /api/me/profile can co maNhanVien", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/me/profile")
    .set("x-test-role", "admin");

  assert.equal(response.status, 400);
});

test("Admin xem duoc profile khi truyen maNhanVien", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/me/profile")
    .query({ maNhanVien: "NV002" })
    .set("x-test-role", "admin");

  assert.equal(response.status, 200);
  assert.equal(response.body.MaNhanVien, "NV002");
});

test("Nhan vien khong duoc vao API admin-only", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/admin-only")
    .set("x-test-role", "nhanvien")
    .set("x-test-manv", "NV001");

  assert.equal(response.status, 403);
});

test("Admin duoc vao API admin-only", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/admin-only")
    .set("x-test-role", "admin");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test("/api/me/chamcong ho tro loc thang nam va phan trang", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/me/chamcong")
    .query({ thang: 4, nam: 2026, page: 2, limit: 5 })
    .set("x-test-role", "nhanvien")
    .set("x-test-manv", "NV001");

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 2);
  assert.equal(response.body.limit, 5);
  assert.equal(response.body.totalItems, 25);
  assert.equal(response.body.totalPages, 5);
  assert.equal(response.body.filters.thang, 4);
  assert.equal(response.body.filters.nam, 2026);
  assert.equal(lastChamCongQuery.MaNhanVien, "NV001");
  assert.ok(lastChamCongQuery.NgayCong);
});

test("/api/me/luong ho tro loc thang nam va phan trang", async () => {
  const app = createTestApp();
  const response = await request(app)
    .get("/api/me/luong")
    .query({ thang: 4, nam: 2026, page: 1, limit: 3 })
    .set("x-test-role", "nhanvien")
    .set("x-test-manv", "NV001");

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.limit, 3);
  assert.equal(response.body.totalItems, 12);
  assert.equal(response.body.totalPages, 4);
  assert.equal(lastLuongQuery.MaNhanVien, "NV001");
  assert.equal(lastLuongQuery.Thang, 4);
  assert.equal(lastLuongQuery.Nam, 2026);
});
