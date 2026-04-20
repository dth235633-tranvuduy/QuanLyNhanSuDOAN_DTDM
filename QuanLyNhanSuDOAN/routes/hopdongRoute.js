const HopDong = require("../models/HopDong");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(HopDong, "MaHopDong");
