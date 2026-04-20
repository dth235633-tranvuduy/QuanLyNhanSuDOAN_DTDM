const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

const nhanvienRoute = require("./routes/nhanvienRoute");
const taikhoanRoute = require("./routes/taikhoanRoute");
const trinhdoRoute = require("./routes/trinhdoRoute");
const phongbanRoute = require("./routes/phongbanRoute");
const chucvuRoute = require("./routes/chucvuRoute");
const chamcongRoute = require("./routes/chamcongRoute");
const hopdongRoute = require("./routes/hopdongRoute");
const luongnhanvienRoute = require("./routes/luongnhanvienRoute");
const meRoute = require("./routes/meRoute");
const adminRouter = require("./routers/adminRouter");
const userRouter = require("./routers/userRouter");
const authRouter = require("./routers/authRouter");
const { attachAuthLocals, requireRole } = require("./middlewares/auth");
const { attachActivityLogger } = require("./middlewares/activityLogger");

const app = express();

app.set("view engine", "ejs");
app.set("views", `${__dirname}/views`);
app.use(express.static(`${__dirname}/public`));

// Cho phép bồi bàn (Frontend) gọi món
app.use(cors());
// Cho phép đọc dữ liệu định dạng JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "qlns.sid",
    secret: process.env.SESSION_SECRET || "seventime-hrms-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(attachAuthLocals);
app.use(attachActivityLogger);

// Kết nối với MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() =>
    console.log(
      "✅ Đã kết nối thành công với MongoDB Atlas (Kho nguyên liệu)!",
    ),
  )
  .catch((err) => console.log("❌ Lỗi kết nối Database: ", err));

// Trang chủ hệ thống
app.get("/", (req, res) => {
  res.render("home", {
    title: "SevenTime HRMS",
    companyName: "Công ty SevenTime",
    year: new Date().getFullYear(),
  });
});

app.use("/api/me", requireRole("nhanvien", "admin"), meRoute);
app.use("/api", requireRole("admin"));
app.use("/api/nhanvien", nhanvienRoute);
app.use("/api/taikhoan", taikhoanRoute);
app.use("/api/trinhdo", trinhdoRoute);
app.use("/api/phongban", phongbanRoute);
app.use("/api/chucvu", chucvuRoute);
app.use("/api/chamcong", chamcongRoute);
app.use("/api/hopdong", hopdongRoute);
app.use("/api/luongnhanvien", luongnhanvienRoute);
app.use(authRouter);
app.use("/admin", requireRole("admin"), adminRouter);
app.use("/user", requireRole("nhanvien"), userRouter);

// Khởi động Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Bếp trưởng đang đợi lệnh tại cổng http://localhost:${PORT}`);
});
