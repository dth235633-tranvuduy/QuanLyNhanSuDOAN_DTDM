const express = require("express");
const {
  isAutoCodeField,
  generateNextCode,
} = require("../modules/codeGenerator");

function buildCrudRouter(Model, keyField) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const data = await Model.find();
      res.json(data);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Loi lay danh sach", error: error.message });
    }
  });

  router.get(`/:${keyField}`, async (req, res) => {
    try {
      const value = req.params[keyField];
      const item = await Model.findOne({ [keyField]: value });
      if (!item) {
        return res.status(404).json({ message: "Khong tim thay du lieu" });
      }
      res.json(item);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Loi lay chi tiet", error: error.message });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const payload = { ...req.body };

      if (isAutoCodeField(keyField)) {
        payload[keyField] = await generateNextCode(Model, keyField);
      }

      const created = await Model.create(payload);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ message: "Loi tao moi", error: error.message });
    }
  });

  router.put(`/:${keyField}`, async (req, res) => {
    try {
      const value = req.params[keyField];
      const payload = { ...req.body };
      delete payload[keyField];

      const updated = await Model.findOneAndUpdate(
        { [keyField]: value },
        payload,
        { new: true, runValidators: true },
      );

      if (!updated) {
        return res
          .status(404)
          .json({ message: "Khong tim thay du lieu de cap nhat" });
      }

      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Loi cap nhat", error: error.message });
    }
  });

  router.delete(`/:${keyField}`, async (req, res) => {
    try {
      const value = req.params[keyField];
      const deleted = await Model.findOneAndDelete({ [keyField]: value });
      if (!deleted) {
        return res
          .status(404)
          .json({ message: "Khong tim thay du lieu de xoa" });
      }
      res.json({ message: "Xoa thanh cong" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Loi xoa du lieu", error: error.message });
    }
  });

  return router;
}

module.exports = buildCrudRouter;
