import path from "path";

export const storageConfig = {
  uploadDir: path.resolve(__dirname, "../../../storage"),
  maxFileSize: 15 * 1024 * 1024, // 15 MB
};
