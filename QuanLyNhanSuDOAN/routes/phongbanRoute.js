const PhongBan = require("../models/PhongBan");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(PhongBan, "MaPhongBan");
