const TaiKhoan = require("../models/TaiKhoan");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(TaiKhoan, "TenDangNhap");
