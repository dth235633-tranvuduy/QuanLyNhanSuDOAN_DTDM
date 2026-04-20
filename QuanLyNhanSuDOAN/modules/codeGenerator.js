const AUTO_CODE_CONFIG = {
  MaNhanVien: { prefix: "NV", minDigits: 3 },
  MaPhongBan: { prefix: "PB", minDigits: 2 },
  MaChucVu: { prefix: "CV", minDigits: 2 },
  MaHopDong: { prefix: "HD", minDigits: 2 },
  MaTrinhDo: { prefix: "TD", minDigits: 2 },
};

function isAutoCodeField(fieldName) {
  return Boolean(AUTO_CODE_CONFIG[fieldName]);
}

function extractNumber(code, prefix) {
  const text = String(code || "").trim();
  if (!text.startsWith(prefix)) return null;

  const numberPart = text.slice(prefix.length);
  if (!/^\d+$/.test(numberPart)) return null;

  const parsed = Number.parseInt(numberPart, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

async function generateNextCode(Model, keyField) {
  const config = AUTO_CODE_CONFIG[keyField];
  if (!config) return null;

  const { prefix, minDigits } = config;

  const lastRows = await Model.find({ [keyField]: { $regex: `^${prefix}` } })
    .select({ [keyField]: 1, _id: 0 })
    .lean();

  let maxNumber = 0;
  for (const row of lastRows) {
    const current = extractNumber(row[keyField], prefix);
    if (current && current > maxNumber) {
      maxNumber = current;
    }
  }

  const nextNumber = maxNumber + 1;
  const digitCount = Math.max(minDigits, String(nextNumber).length);
  return `${prefix}${String(nextNumber).padStart(digitCount, "0")}`;
}

module.exports = {
  AUTO_CODE_CONFIG,
  isAutoCodeField,
  generateNextCode,
};
