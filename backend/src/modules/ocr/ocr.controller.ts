import { Request, Response, NextFunction } from "express";
import { ocrService } from "./ocr.service";
import { DocumentType } from "./ocr.types";

/**
 * Controller for the /api/ocr routes.
 * Handles the /ocr/extract endpoint — runs the full OCR pipeline on an uploaded document image.
 */
export class OcrController {
  /**
   * POST /api/ocr/extract
   * Multipart file: 'document' (required). Form field: 'doc_type' (optional).
   */
  async extract(req: Request, res: Response, next: NextFunction) {
    try {
      const file =
        req.file ??
        (req.files as { [k: string]: Express.Multer.File[] } | undefined)?.[
          "document"
        ]?.[0];

      if (!file) {
        return res.status(400).json({
          error: "MISSING_FILE",
          message:
            "A document image is required. Upload as 'document' in multipart/form-data.",
        });
      }

      const docType = (req.body?.doc_type ||
        req.query?.doc_type ||
        null) as DocumentType | null;

      const result = await ocrService.extract(
        file.buffer,
        file.originalname,
        docType
      );
      return res.status(200).json(result);
    } catch (err: unknown) {
      next(err);
    }
  }
}

export const ocrController = new OcrController();
