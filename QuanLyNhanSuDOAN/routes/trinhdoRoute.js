const TrinhDo = require("../models/TrinhDo");
const buildCrudRouter = require("./crudFactory");

module.exports = buildCrudRouter(TrinhDo, "MaTrinhDo");
