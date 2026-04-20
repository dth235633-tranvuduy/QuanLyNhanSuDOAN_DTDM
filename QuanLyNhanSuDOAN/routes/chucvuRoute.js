const ChucVu = require("../models/ChucVu");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(ChucVu, "MaChucVu");
