const ThongBaoNoiBo = require("../models/ThongBaoNoiBo");

function toIsoWithOffset(minutesOffset = 0) {
  return new Date(Date.now() + minutesOffset * 60 * 1000).toISOString();
}

const DEFAULT_FALLBACK_ITEMS = [
  {
    title: "Triển khai checklist chấm công đầu ca và cuối ca toàn công ty",
    source: "Trung tâm vận hành HRMS",
    category: "Van hanh",
    priority: "Quan trong",
    publishedAt: toIsoWithOffset(-25),
    url: "#",
    description:
      "Từ hôm nay hệ thống nhắc tự động tại 08:00 và 17:00, giúp giảm thiếu dữ liệu công và sai lệch bảng lương.",
  },
  {
    title: "Lịch đào tạo bắt buộc: An toàn dữ liệu nhân sự tháng này",
    source: "Phòng nhân sự",
    category: "Dao tao",
    priority: "Quan trong",
    publishedAt: toIsoWithOffset(-180),
    url: "#",
    description:
      "Toàn bộ nhân viên hoàn tất module e-learning trong 7 ngày để đảm bảo chuẩn bảo mật dữ liệu cá nhân.",
  },
  {
    title: "Điều chỉnh quy trình xin nghỉ phép liên thông bảng công",
    source: "Ban điều hành",
    category: "Chinh sach",
    priority: "Khan cap",
    publishedAt: toIsoWithOffset(-360),
    url: "#",
    description:
      "Đơn nghỉ được duyệt sẽ tự cập nhật trạng thái công theo ngày, giảm thao tác thủ công ở bộ phận nhân sự.",
  },
  {
    title: "Mở đăng ký workshop: Quản trị hiệu suất theo OKR",
    source: "Học viện nội bộ",
    category: "Dao tao",
    priority: "Thuong",
    publishedAt: toIsoWithOffset(-540),
    url: "#",
    description:
      "Workshop chuyên sâu cho quản lý nhóm về thiết lập mục tiêu quý và đo lường kết quả minh bạch.",
  },
  {
    title: "Thông báo lịch bảo trì hệ thống HRMS cuối tuần",
    source: "Đội kỹ thuật",
    category: "Van hanh",
    priority: "Quan trong",
    publishedAt: toIsoWithOffset(-720),
    url: "#",
    description:
      "Hệ thống tạm gián đoạn từ 22:00 đến 23:30 thứ Bảy để nâng cấp hiệu năng và tối ưu tốc độ truy vấn.",
  },
  {
    title: "Cập nhật lịch sự kiện nội bộ quý II/2026",
    source: "Văn phòng nhân sự",
    category: "Su kien",
    priority: "Thuong",
    publishedAt: toIsoWithOffset(-900),
    url: "#",
    description:
      "Chuỗi hoạt động gắn kết đội ngũ, chương trình mentoring và ngày hội sức khỏe sẽ diễn ra theo lịch mới.",
  },
  {
    title: "Khuyến nghị chuẩn hóa hồ sơ nhân sự trước kỳ đánh giá",
    source: "Bộ phận C&B",
    category: "Noi bo",
    priority: "Quan trong",
    publishedAt: toIsoWithOffset(-1080),
    url: "#",
    description:
      "Nhân viên vui lòng rà soát CCCD, thông tin liên hệ và hợp đồng để đảm bảo dữ liệu đánh giá chính xác.",
  },
  {
    title: "Chính sách làm việc linh hoạt được áp dụng từ tháng sau",
    source: "Khối nhân sự chiến lược",
    category: "Chinh sach",
    priority: "Quan trong",
    publishedAt: toIsoWithOffset(-1260),
    url: "#",
    description:
      "Mô hình hybrid 3-2 được áp dụng cho các phòng ban phù hợp, có theo dõi KPI và SLA rõ ràng.",
  },
  {
    title: "Thông báo chương trình vinh danh nhân sự xuất sắc tuần",
    source: "Ban văn hóa doanh nghiệp",
    category: "Su kien",
    priority: "Thuong",
    publishedAt: toIsoWithOffset(-1440),
    url: "#",
    description:
      "Bảng vinh danh hiển thị tại dashboard, cập nhật tự động vào sáng thứ Hai hàng tuần.",
  },
  {
    title: "Mở đợt khảo sát mức độ hài lòng về phúc lợi nhân viên",
    source: "Phòng nhân sự",
    category: "Noi bo",
    priority: "Thuong",
    publishedAt: toIsoWithOffset(-1620),
    url: "#",
    description:
      "Kết quả khảo sát là đầu vào cho kế hoạch cải tiến phúc lợi và trải nghiệm nhân viên nửa cuối năm.",
  },
  {
    title: "Quy chuẩn phản hồi ticket HR được nâng lên mức SLA 24h",
    source: "Khối vận hành",
    category: "Van hanh",
    priority: "Khan cap",
    publishedAt: toIsoWithOffset(-1800),
    url: "#",
    description:
      "Các yêu cầu liên quan lương, hợp đồng, nghỉ phép sẽ được phân luồng tự động và theo dõi SLA trực tiếp.",
  },
  {
    title: "Bản tin thị trường: nhu cầu nhân sự số tăng mạnh trong 2026",
    source: "Bản tin nhân sự",
    category: "Tin thi truong",
    priority: "Thuong",
    publishedAt: toIsoWithOffset(-1980),
    url: "#",
    description:
      "Doanh nghiệp tập trung tuyển các vị trí HR Analytics, Employer Branding và quản trị năng suất.",
  },
];

const CATEGORY_LABELS = {
  noi_bo: "Nội bộ",
  chinh_sach: "Chính sách",
  dao_tao: "Đào tạo",
  su_kien: "Sự kiện",
  van_hanh: "Vận hành",
  tin_thi_truong: "Tin thị trường",
};

const PRIORITY_LABELS = {
  thuong: "Thường",
  quan_trong: "Quan trọng",
  khan_cap: "Khẩn cấp",
};

const PRIORITY_SCORE = {
  thuong: 1,
  quan_trong: 2,
  khan_cap: 3,
};

function stripVi(text = "") {
  return String(text || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function keyifyLabel(text = "") {
  const normalized = stripVi(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  return normalized.replace(/^_+|_+$/g, "");
}

function normalizeCategory(rawCategory = "") {
  const key = keyifyLabel(rawCategory);
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  return CATEGORY_LABELS.noi_bo;
}

function normalizePriority(rawPriority = "") {
  const key = keyifyLabel(rawPriority);
  if (PRIORITY_LABELS[key]) return PRIORITY_LABELS[key];
  return PRIORITY_LABELS.thuong;
}

const cache = {
  dateKey: "",
  items: [],
};

function toDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeItem(item) {
  const category = normalizeCategory(item.category || "Tin thị trường");
  const priority = normalizePriority(item.priority || "Thường");
  return {
    title: item.title || "(Không có tiêu đề)",
    source: item.source?.name || item.source || "Nguồn tổng hợp",
    publishedAt: item.publishedAt || item.pubDate || new Date().toISOString(),
    url: item.url || "#",
    description: item.description || item.contentSnippet || "",
    category,
    priority,
    isInternal: false,
  };
}

function normalizeInternalItem(item) {
  const category = normalizeCategory(item.category || "Nội bộ");
  const priority = normalizePriority(item.priority || "Thường");
  return {
    title: item.title || "(Không có tiêu đề)",
    source: item.source || "Thông báo nội bộ",
    publishedAt: item.publishedAt || new Date().toISOString(),
    url: item.url || "#",
    description: item.description || "",
    category,
    priority,
    isInternal: true,
  };
}

function normalizeLimit(limit, fallback = 8) {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  if (parsed > 60) return 60;
  return parsed;
}

async function getInternalNewsItems(limit = 8) {
  try {
    const safeLimit = normalizeLimit(limit, 8);
    const rows = await ThongBaoNoiBo.find()
      .sort({ publishedAt: -1, _id: -1 })
      .limit(safeLimit)
      .lean();
    return rows.map(normalizeInternalItem);
  } catch (error) {
    return [];
  }
}

function mergeAndSortNewsItems(internalItems = [], externalItems = []) {
  return [...internalItems, ...externalItems].sort((a, b) => {
    const priorityA = PRIORITY_SCORE[keyifyLabel(a.priority)] || 1;
    const priorityB = PRIORITY_SCORE[keyifyLabel(b.priority)] || 1;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    const safeA = Number.isNaN(timeA) ? 0 : timeA;
    const safeB = Number.isNaN(timeB) ? 0 : timeB;
    return safeB - safeA;
  });
}

async function createInternalNewsItem(payload = {}) {
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const source = String(payload.source || "Thông báo nội bộ").trim();
  const category = normalizeCategory(payload.category || "Nội bộ");
  const priority = normalizePriority(payload.priority || "Thường");
  const rawUrl = String(payload.url || "").trim();
  const createdBy = String(payload.createdBy || "admin").trim();

  if (!title) {
    throw new Error("Tieu de thong bao khong duoc de trong");
  }

  const item = await ThongBaoNoiBo.create({
    title,
    description,
    source: source || "Thông báo nội bộ",
    category,
    priority,
    url: rawUrl || "#",
    publishedAt: new Date(),
    createdBy: createdBy || "admin",
  });

  return normalizeInternalItem(item.toObject ? item.toObject() : item);
}

async function fetchFromExternal() {
  const customUrl = process.env.NEWS_API_URL;
  const apiKey = process.env.NEWS_API_KEY;

  if (!customUrl && !apiKey) {
    return DEFAULT_FALLBACK_ITEMS;
  }

  const endpoint = customUrl
    ? customUrl
    : `https://newsapi.org/v2/top-headlines?language=vi&pageSize=12&apiKey=${apiKey}`;

  if (typeof fetch !== "function") {
    throw new Error("Môi trường Node hiện tại chưa hỗ trợ fetch");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`News API trả về mã ${response.status}`);
    }

    const payload = await response.json();
    const list = Array.isArray(payload.articles)
      ? payload.articles
      : Array.isArray(payload.items)
        ? payload.items
        : [];

    if (!list.length) {
      return DEFAULT_FALLBACK_ITEMS;
    }

    return list.map(normalizeItem);
  } finally {
    clearTimeout(timeout);
  }
}

async function getDailyNewsItems(limit = 8) {
  const safeLimit = normalizeLimit(limit, 8);
  const dateKey = toDateKey();
  let externalItems = [];

  if (cache.dateKey === dateKey && cache.items.length) {
    externalItems = cache.items;
  } else {
    externalItems = await fetchFromExternal();
    cache.dateKey = dateKey;
    cache.items = externalItems;
  }

  const internalItems = await getInternalNewsItems(safeLimit * 2);
  const mergedItems = mergeAndSortNewsItems(internalItems, externalItems);

  return mergedItems.slice(0, safeLimit);
}

module.exports = {
  getDailyNewsItems,
  createInternalNewsItem,
};
