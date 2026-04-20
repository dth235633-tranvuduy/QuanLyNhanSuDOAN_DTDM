const NhanVien = require("../models/NhanVien");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(NhanVien, "MaNhanVien");
