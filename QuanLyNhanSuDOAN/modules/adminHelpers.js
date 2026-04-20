function toInputType(instance) {
  if (instance === "Date") return "date";
  if (instance === "Number") return "number";
  return "text";
}

const MONEY_FIELDS = new Set(["MucLuong", "PhuCapCoDinh", "Thuong", "KhauTru"]);

const FIELD_LABELS = {
  MaNhanVien: "Mã nhân viên",
  HinhAnh: "Hình ảnh",
  HoTen: "Họ tên",
  NgaySinh: "Ngày sinh",
  GioiTinh: "Giới tính",
  CCCD: "CCCD",
  Email: "Email",
  SoDienThoai: "Số điện thoại",
  DiaChi: "Địa chỉ",
  NgayVaoLam: "Ngày vào làm",
  TrangThai_NhanVien: "Trạng thái nhân viên",
  MaPhongBan: "Mã phòng ban",
  MaChucVu: "Mã chức vụ",
  MaTrinhDo: "Mã trình độ",
  TenDangNhap: "Tên đăng nhập",
  MatKhau: "Mật khẩu",
  TrangThai_TaiKhoan: "Trạng thái tài khoản",
  TenTrinhDo: "Tên trình độ",
  TenPhongBan: "Tên phòng ban",
  TenChucVu: "Tên chức vụ",
  MaChamCong: "Mã chấm công",
  NgayCong: "Ngày công",
  TrangThai_ChamCong: "Trạng thái chấm công",
  MaHopDong: "Mã hợp đồng",
  LoaiHopDong: "Loại hợp đồng",
  TrangThai_HopDong: "Trạng thái hợp đồng",
  NgayBatDau: "Ngày bắt đầu",
  NgayKetThuc: "Ngày kết thúc",
  MucLuong: "Mức lương",
  PhuCapCoDinh: "Phụ cấp cố định",
  HeSoLuong: "Hệ số lương",
  SoGioCong: "Số giờ công",
  MaBangLuong: "Mã bảng lương",
  Thang: "Tháng",
  Nam: "Năm",
  SoNgayCong: "Số ngày công",
  Thuong: "Thưởng",
  KhauTru: "Khấu trừ",
  MaDonNghi: "Mã đơn nghỉ",
  TuNgay: "Từ ngày",
  DenNgay: "Đến ngày",
  LoaiNghi: "Loại nghỉ",
  LyDo: "Lý do",
  TrangThaiDon: "Trạng thái đơn",
  PhanHoiAdmin: "Phản hồi admin",
  NgayTao: "Ngày tạo",
  NgayCapNhat: "Ngày cập nhật",
};

function fallbackFieldLabel(name) {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
}

function toFieldLabel(name) {
  return FIELD_LABELS[name] || fallbackFieldLabel(name);
}

function toFieldMeta(model, keyField) {
  return Object.entries(model.schema.paths)
    .filter(([name]) => name !== "_id" && name !== "__v")
    .map(([name, path]) => ({
      name,
      label: toFieldLabel(name),
      required: Boolean(path.isRequired),
      isKey: name === keyField,
      inputType: name === "MatKhau" ? "password" : toInputType(path.instance),
      instance: path.instance,
      isMoney: MONEY_FIELDS.has(name),
      isPassword: name === "MatKhau",
      enumValues: Array.isArray(path.enumValues)
        ? path.enumValues.filter(Boolean)
        : [],
    }));
}

function normalizePayload(fields, body, isCreate) {
  const payload = {};

  fields.forEach((field) => {
    if (!isCreate && field.isKey) return;

    let value = body[field.name];

    if (!isCreate && field.name === "MatKhau" && String(value || "") === "") {
      return;
    }

    if (value === undefined || value === null || value === "") {
      if (field.instance === "Number") value = 0;
      else if (field.instance === "Date") value = null;
      else value = "";
    }

    if (field.instance === "Number") {
      const normalizedValue = String(value ?? "")
        .trim()
        .replace(/,/g, "");
      value = Number(normalizedValue);
      if (Number.isNaN(value)) value = 0;
    }

    payload[field.name] = value;
  });

  return payload;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

module.exports = {
  toFieldMeta,
  normalizePayload,
  formatDate,
};
