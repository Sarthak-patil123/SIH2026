import { Router } from "express";
import multer from "multer";
import { ocrController } from "./ocr.controller";
import { authenticate } from "../../middleware/auth.middleware";

export const ocrRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

const ocrUpload = upload.fields([
  { name: "document", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

// POST /api/ocr/extract — JWT-protected
ocrRoutes.post("/extract", authenticate, ocrUpload, (req, res, next) =>
  ocrController.extract(req, res, next)
);

// POST /api/ocr — JWT-protected (alias)
ocrRoutes.post("/", authenticate, ocrUpload, (req, res, next) =>
  ocrController.extract(req, res, next)
);
