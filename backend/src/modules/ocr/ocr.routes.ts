import { Router } from "express";
import multer from "multer";
import { ocrController } from "./ocr.controller";

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

// POST /api/ocr/extract
ocrRoutes.post("/extract", ocrUpload, (req, res, next) =>
  ocrController.extract(req, res, next)
);

// POST /api/ocr
ocrRoutes.post("/", ocrUpload, (req, res, next) =>
  ocrController.extract(req, res, next)
);
