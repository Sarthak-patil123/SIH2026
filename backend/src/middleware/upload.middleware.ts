import multer from "multer";
import { storageConfig } from "../config/storage";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storageConfig.uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

export const upload = multer({ storage, limits: { fileSize: storageConfig.maxFileSize } });
