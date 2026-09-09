import { Request, Response, NextFunction } from "express";
import { faceService } from "./face.service";

/**
 * Controller for /api/face-verification routes.
 */
export class FaceController {
  /**
   * POST /api/face-verification/verify
   * Multipart files: 'document' (ID/passport image) and 'selfie' (live photo).
   * Extracts document portrait via YOLO then runs ArcFace 1:1 comparison.
   */
  async verifyDocumentFace(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const docFile =
        files?.["document"]?.[0] ??
        files?.["passport"]?.[0] ??
        files?.["id"]?.[0];
      const selfieFile =
        files?.["selfie"]?.[0] ??
        files?.["face"]?.[0] ??
        files?.["live_photo"]?.[0];

      if (!docFile || !selfieFile) {
        return res.status(400).json({
          error: "MISSING_FILES",
          message:
            "Both 'document' and 'selfie' files are required as multipart/form-data fields.",
        });
      }

      const result = await faceService.verifyDocumentFace(
        docFile.buffer,
        docFile.originalname,
        selfieFile.buffer,
        selfieFile.originalname
      );
      return res.status(200).json(result);
    } catch (err: unknown) {
      next(err);
    }
  }

  /**
   * POST /api/face-verification/compare
   * Multipart files: 'image1' and 'image2' — any two face images.
   * Direct ArcFace comparison without document layout parsing.
   */
  async compareFaces(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const img1 = files?.["image1"]?.[0];
      const img2 = files?.["image2"]?.[0];

      if (!img1 || !img2) {
        return res.status(400).json({
          error: "MISSING_FILES",
          message:
            "Both 'image1' and 'image2' files are required as multipart/form-data fields.",
        });
      }

      const result = await faceService.compareFaces(
        img1.buffer,
        img1.originalname,
        img2.buffer,
        img2.originalname
      );
      return res.status(200).json(result);
    } catch (err: unknown) {
      next(err);
    }
  }
}

export const faceController = new FaceController();
