const ChamCong = require("../models/ChamCong");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(ChamCong, "MaChamCong");
