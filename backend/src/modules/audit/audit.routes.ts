import { Router } from 'express';
import multer from 'multer';
import { auditController } from './audit.controller';
import { optionalAuthenticate } from '../../middleware/optional-auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

export const auditRoutes = Router();

auditRoutes.use(optionalAuthenticate);

// POST /api/audit/record — Record lifecycle phase into blockchain
auditRoutes.post('/record', (req, res, next) =>
  auditController.recordCasePhase(req, res, next)
);

// POST /api/audit/document-hash — Anchor document SHA-256 hash onto blockchain
auditRoutes.post('/document-hash', upload.single('file'), (req, res, next) =>
  auditController.recordDocumentHash(req, res, next)
);

// POST /api/audit/face-verification — Record full audit trail of case at face verification phase
auditRoutes.post(
  '/face-verification',
  upload.fields([
    { name: 'document_face', maxCount: 1 },
    { name: 'docFace', maxCount: 1 },
    { name: 'selfie_face', maxCount: 1 },
    { name: 'selfieFace', maxCount: 1 },
  ]),
  (req, res, next) => auditController.recordFaceVerification(req, res, next)
);

// GET /api/audit/case/:caseId — Retrieve full audit trail with all doc hashes & face verifications
auditRoutes.get('/case/:caseId', (req, res, next) =>
  auditController.getCaseAuditTrail(req, res, next)
);

// GET /api/audit/case/:caseId/verify — Verify SHA-256 chain integrity
auditRoutes.get('/case/:caseId/verify', (req, res, next) =>
  auditController.verifyCaseChain(req, res, next)
);

// GET /api/audit/record/:id — Get single audit record
auditRoutes.get('/record/:id', (req, res, next) =>
  auditController.getAuditRecordById(req, res, next)
);

// GET /api/audit/all — Get all audit records across cases
auditRoutes.get('/all', (req, res, next) =>
  auditController.getAllAuditRecords(req, res, next)
);

// POST /api/audit/verify-document — Verify document file hash
auditRoutes.post('/verify-document', upload.single('file'), (req, res, next) =>
  auditController.verifyDocumentHashMatch(req, res, next)
);
