import { Request, Response, NextFunction } from "express";
import { faceService } from "./face.service";
import { auditService } from "../audit/audit.service";
import { auditHashService } from "../audit/audit-hash.service";

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

      const caseId = (req.body.caseId as string) || (req.query.caseId as string);
      const user = (req as any).user;

      const result = await faceService.verifyDocumentFace(
        docFile.buffer,
        docFile.originalname,
        selfieFile.buffer,
        selfieFile.originalname
      );

      // If a case ID is provided, automatically anchor the face verification audit into the blockchain
      if (caseId) {
        try {
          const docFaceHash = auditHashService.calculateSha256(docFile.buffer);
          const selfieFaceHash = auditHashService.calculateSha256(selfieFile.buffer);
          const similarityScore = (result as any).similarity ?? (result as any).score ?? ((result as any).match ? 92.5 : 35.0);
          const isMatch = (result as any).match ?? (similarityScore >= 70);

          const auditRecord = await auditService.recordFaceVerificationAudit(
            {
              caseId,
              docFaceHash,
              selfieFaceHash,
              matchScore: similarityScore,
              distance: (result as any).distance,
              threshold: (result as any).threshold,
              status: isMatch ? 'MATCH' : 'MISMATCH',
              phase: req.body.phase || 'FACE_VERIFICATION_PHASE_1',
              actorId: user?.id || 'OFFICER',
              details: {
                verificationResult: result,
                docFilename: docFile.originalname,
                selfieFilename: selfieFile.originalname,
              },
            },
            docFile.buffer,
            selfieFile.buffer
          );

          return res.status(200).json({
            ...result,
            blockchainAudit: {
              anchored: true,
              txId: auditRecord.txResult.txId,
              blockNumber: auditRecord.txResult.blockNumber,
              eventHash: auditRecord.txResult.eventHash,
              docFaceHash,
              selfieFaceHash,
            },
          });
        } catch (auditErr) {
          console.warn('[FaceController] Blockchain audit recording warning:', auditErr);
        }
      }

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
