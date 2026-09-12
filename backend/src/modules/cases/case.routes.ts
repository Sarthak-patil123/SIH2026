import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { caseController } from './case.controller';

export const caseRoutes = Router();
const ctrl = new CaseController();

// All case routes require authentication
caseRoutes.use(authenticate);

// POST /api/cases — Create a new case
caseRoutes.post('/', (req, res, next) =>
  caseController.createCase(req, res, next)
);

// GET /api/cases — Officer (own cases) or Admin (all cases)
caseRoutes.get('/', requireRole(Role.OFFICER, Role.ADMIN), (req, res, next) =>
  caseController.getCases(req, res, next)
);

// GET /api/cases/activity — Recent dynamic activity stream for sidebar
caseRoutes.get('/activity', requireRole(Role.OFFICER, Role.ADMIN), (req, res, next) =>
  caseController.getRecentActivity(req, res, next)
);

// GET /api/cases/:caseId — Officer (own only) or Admin (any)
caseRoutes.get('/:caseId', requireRole(Role.OFFICER, Role.ADMIN), (req, res, next) =>
  caseController.getCaseById(req, res, next)
);

// PATCH /api/cases/:id — Update case fields
caseRoutes.patch('/:id', requireRole(Role.OFFICER, Role.ADMIN), (req, res, next) =>
  caseController.updateCase(req, res, next)
);

// DELETE /api/cases/:id — Admin only
caseRoutes.delete('/:id', requireRole(Role.ADMIN), (req, res, next) =>
  caseController.deleteCase(req, res, next)
);

// POST /api/cases/:caseId/flag — Officer only
caseRoutes.post('/:caseId/flag', requireRole(Role.OFFICER), (req, res) =>
  caseController.flagCase(req, res)
);

// POST /api/cases/:caseId/decision — Admin only
caseRoutes.post('/:caseId/decision', requireRole(Role.ADMIN), (req, res) =>
  caseController.makeDecision(req, res)
);
