const LuongNhanVien = require("../models/LuongNhanVien");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(LuongNhanVien, "MaBangLuong");
