import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role, CaseStatus, RiskLevel } from '@prisma/client';

const prisma = new PrismaClient();

export class CaseController {
  /**
   * POST /api/cases
   * Create a new case
   */
  async createCase(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const { title, description, riskLevel, riskScore, personName } = req.body;

      if (!title) {
        res.status(400).json({ error: 'Title is required.' });
        return;
      }

      const created = await prisma.case.create({
        data: {
          title,
          personName: personName || 'Unknown Subject',
          riskLevel: (riskLevel as RiskLevel) || RiskLevel.LOW,
          riskScore: riskScore ?? 10.0,
          officerId: user?.id || req.body.assignedTo,
          status: CaseStatus.PENDING,
        },
      });

      res.status(201).json(created);
    } catch (err) {
      if (next) next(err);
      else res.status(500).json({ error: 'Failed to create case.' });
    }
  }

  /**
   * GET /api/cases
   * - OFFICER: returns only their own cases (officerId = req.user.id)
   * - ADMIN: returns all cases
   */
  async getCases(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const where = user?.role === Role.OFFICER ? { officerId: user.id } : {};
      const cases = await prisma.case.findMany({
        where,
        include: { officer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ cases });
    } catch (err) {
      console.error('[CaseController.getCases]', err);
      if (next) next(err);
      else res.status(500).json({ error: 'Failed to retrieve cases.' });
    }
  }

  // Alias for listCases
  async listCases(req: Request, res: Response, next?: NextFunction): Promise<void> {
    return this.getCases(req, res, next);
  }

  /**
   * GET /api/cases/:caseId (or :id)
   * - OFFICER: only their own case; returns 403 if not theirs
   * - ADMIN: any case
   */
  async getCaseById(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const caseId = req.params.caseId || req.params.id;

      const found = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          officer: { select: { id: true, name: true, email: true } },
          documents: true,
          auditLogs: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!found) {
        res.status(404).json({ error: 'Case not found.' });
        return;
      }

      if (user && user.role === Role.OFFICER && found.officerId !== user.id) {
        res.status(403).json({ error: 'Forbidden: This case does not belong to you.' });
        return;
      }

      res.json({ case: found });
    } catch (err) {
      console.error('[CaseController.getCaseById]', err);
      if (next) next(err);
      else res.status(500).json({ error: 'Failed to retrieve case.' });
    }
  }

  /**
   * PATCH /api/cases/:id
   */
  async updateCase(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const caseId = req.params.caseId || req.params.id;
      const { status, riskLevel, riskScore, personName, title } = req.body;

      const updated = await prisma.case.update({
        where: { id: caseId },
        data: {
          ...(status ? { status } : {}),
          ...(riskLevel ? { riskLevel } : {}),
          ...(riskScore !== undefined ? { riskScore } : {}),
          ...(personName ? { personName } : {}),
          ...(title ? { title } : {}),
        },
      });
      res.json(updated);
    } catch (err) {
      if (next) next(err);
      else res.status(500).json({ error: 'Failed to update case.' });
    }
  }

  /**
   * DELETE /api/cases/:id
   */
  async deleteCase(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const caseId = req.params.caseId || req.params.id;
      await prisma.case.delete({ where: { id: caseId } });
      res.json({ success: true });
    } catch (err) {
      if (next) next(err);
      else res.status(500).json({ error: 'Failed to delete case.' });
    }
  }

  /**
   * POST /api/cases/:caseId/flag
   * OFFICER only — flag a case for admin review
   */
  async flagCase(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const caseId = req.params.caseId || req.params.id;

      const found = await prisma.case.findUnique({ where: { id: caseId } });
      if (!found) { res.status(404).json({ error: 'Case not found.' }); return; }
      if (found.officerId !== user.id) {
        res.status(403).json({ error: 'Forbidden: You can only flag your own cases.' });
        return;
      }

      const updated = await prisma.case.update({
        where: { id: caseId },
        data: { status: 'FLAGGED' },
      });
      res.json({ case: updated });
    } catch (err) {
      console.error('[CaseController.flagCase]', err);
      res.status(500).json({ error: 'Failed to flag case.' });
    }
  }

  /**
   * POST /api/cases/:caseId/decision
   * ADMIN only — approve or reject a case
   */
  async makeDecision(req: Request, res: Response): Promise<void> {
    try {
      const caseId = req.params.caseId || req.params.id;
      const { decision } = req.body; // "APPROVED" | "REJECTED"

      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        res.status(400).json({ error: 'Decision must be APPROVED or REJECTED.' });
        return;
      }

      const found = await prisma.case.findUnique({ where: { id: caseId } });
      if (!found) { res.status(404).json({ error: 'Case not found.' }); return; }

      const updated = await prisma.case.update({
        where: { id: caseId },
        data: { status: decision as CaseStatus },
      });
      res.json({ case: updated });
    } catch (err) {
      console.error('[CaseController.makeDecision]', err);
      res.status(500).json({ error: 'Failed to record decision.' });
    }
  }
}

export const caseController = new CaseController();
