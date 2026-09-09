import { Router } from "express";
import multer from "multer";
import { faceController } from "./face.controller";
import { authenticate } from "../../middleware/auth.middleware";

export const faceRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

const verifyUpload = upload.fields([
  { name: "document", maxCount: 1 },
  { name: "passport", maxCount: 1 },
  { name: "id", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "face", maxCount: 1 },
  { name: "live_photo", maxCount: 1 },
]);

const compareUpload = upload.fields([
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "face1", maxCount: 1 },
  { name: "face2", maxCount: 1 },
]);

// POST /api/face-verification/verify (document + selfie) — JWT-protected
faceRoutes.post("/verify", authenticate, verifyUpload, (req, res, next) =>
  faceController.verifyDocumentFace(req, res, next)
);

// POST /api/face-verification/compare (image1 + image2) — JWT-protected
faceRoutes.post("/compare", authenticate, compareUpload, (req, res, next) =>
  faceController.compareFaces(req, res, next)
);

