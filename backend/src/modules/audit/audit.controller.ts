import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { auditHashService } from './audit-hash.service';

export class AuditController {
  /**
   * POST /api/audit/record
   * Record a lifecycle event/phase into Hyperledger Fabric blockchain
   */
  async recordCasePhase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { caseId, action, phase, documentHashes, faceVerification, details } = req.body;

      if (!caseId || !action) {
        res.status(400).json({ error: 'caseId and action are required.' });
        return;
      }

      const result = await auditService.recordCasePhaseAudit({
        caseId,
        action,
        phase: phase || 'CASE_LIFECYCLE',
        actorId: user?.id || req.body.actorId || 'OFFICER',
        actorRole: user?.role || 'OFFICER',
        documentHashes,
        faceVerification,
        details,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/audit/document-hash
   * Store and anchor a document's SHA-256 hash onto the Blockchain audit trail
   */
  async recordDocumentHash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const file = req.file;
      const { caseId, documentId, fileName, docType, sha256Hash, ocrConfidence, tamperResult, details } = req.body;

      if (!caseId) {
        res.status(400).json({ error: 'caseId is required.' });
        return;
      }

      const effectiveFileName = fileName || file?.originalname || 'document.pdf';
      const effectiveDocType = docType || 'ID_DOCUMENT';

      let computedHash = sha256Hash;
      if (file?.buffer && !computedHash) {
        computedHash = auditHashService.calculateSha256(file.buffer);
      }

      if (!computedHash && !file?.buffer) {
        res.status(400).json({ error: 'Either document file or sha256Hash is required.' });
        return;
      }

      const result = await auditService.recordDocumentHash(
        {
          caseId,
          documentId,
          fileName: effectiveFileName,
          docType: effectiveDocType,
          sha256Hash: computedHash,
          actorId: user?.id || req.body.actorId || 'OFFICER',
          ocrConfidence: ocrConfidence ? Number(ocrConfidence) : undefined,
          tamperResult: typeof tamperResult === 'string' ? JSON.parse(tamperResult) : tamperResult,
          details: typeof details === 'string' ? JSON.parse(details) : details,
        },
        file?.buffer
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/audit/face-verification
   * Record full audit trail of case at face verification phase
   */
  async recordFaceVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const docFaceFile = files?.['document_face']?.[0] || files?.['docFace']?.[0];
      const selfieFaceFile = files?.['selfie_face']?.[0] || files?.['selfieFace']?.[0];

      const {
        caseId,
        docFaceHash,
        selfieFaceHash,
        matchScore,
        distance,
        threshold,
        status,
        phase,
        livenessScore,
        antiSpoofResult,
        notes,
        details,
      } = req.body;

      if (!caseId) {
        res.status(400).json({ error: 'caseId is required.' });
        return;
      }

      const score = Number(matchScore ?? 0);
      const effectiveStatus = (status as 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE') || (score >= 70 ? 'MATCH' : 'MISMATCH');

      const result = await auditService.recordFaceVerificationAudit(
        {
          caseId,
          docFaceHash,
          selfieFaceHash,
          matchScore: score,
          distance: distance ? Number(distance) : undefined,
          threshold: threshold ? Number(threshold) : undefined,
          status: effectiveStatus,
          phase: phase || 'FACE_VERIFICATION_PHASE',
          livenessScore: livenessScore ? Number(livenessScore) : undefined,
          antiSpoofResult,
          notes,
          actorId: user?.id || req.body.actorId || 'OFFICER',
          details: typeof details === 'string' ? JSON.parse(details) : details,
        },
        docFaceFile?.buffer,
        selfieFaceFile?.buffer
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/audit/case/:caseId
   * Retrieve full audit trail with all document hashes and each face verification step
   */
  async getCaseAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseId = req.params.caseId || (req.params as any).id;
      if (!caseId) {
        res.status(400).json({ error: 'caseId is required.' });
        return;
      }

      const result = await auditService.getCaseAuditTrail(caseId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/audit/case/:caseId/verify
   * Independently verify cryptographic SHA-256 chain integrity
   */
  async verifyCaseChain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseId = req.params.caseId || (req.params as any).id;
      if (!caseId) {
        res.status(400).json({ error: 'caseId is required.' });
        return;
      }

      const verification = await auditService.verifyCaseIntegrity(caseId);
      res.json(verification);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/audit/record/:id
   * Get single audit record
   */
  async getAuditRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const record = await auditService.getAuditRecord(id);
      if (!record) {
        res.status(404).json({ error: 'Audit record not found.' });
        return;
      }
      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/audit/all
   * Get all blockchain audit records
   */
  async getAllAuditRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
      const result = await auditService.getAllAuditRecords(limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/audit/verify-document
   * Verify document buffer against expected SHA-256 hash
   */
  async verifyDocumentHashMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      const expectedHash = req.body.expectedHash || req.body.sha256Hash;

      if (!file || !expectedHash) {
        res.status(400).json({ error: 'Both file upload and expectedHash are required.' });
        return;
      }

      const computedHash = auditHashService.calculateSha256(file.buffer);
      const isMatch = computedHash.toLowerCase() === expectedHash.toLowerCase();

      res.json({
        match: isMatch,
        computedHash,
        expectedHash,
        byteSize: file.size,
        fileName: file.originalname,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
