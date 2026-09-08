import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export class CaseController {
  /**
   * GET /api/cases
   * - OFFICER: returns only their own cases (officerId = req.user.id)
   * - ADMIN: returns all cases
   */
  async getCases(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const where = user.role === Role.OFFICER ? { officerId: user.id } : {};
      const cases = await prisma.case.findMany({
        where,
        include: { officer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ cases });
    } catch (err) {
      console.error('[CaseController.getCases]', err);
      res.status(500).json({ error: 'Failed to retrieve cases.' });
    }
  }

  /**
   * GET /api/cases/:caseId
   * - OFFICER: only their own case; returns 403 if not theirs
   * - ADMIN: any case
   */
  async getCaseById(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { caseId } = req.params;

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

      if (user.role === Role.OFFICER && found.officerId !== user.id) {
        res.status(403).json({ error: 'Forbidden: This case does not belong to you.' });
        return;
      }

      res.json({ case: found });
    } catch (err) {
      console.error('[CaseController.getCaseById]', err);
      res.status(500).json({ error: 'Failed to retrieve case.' });
    }
  }

  /**
   * POST /api/cases/:caseId/flag
   * OFFICER only — flag a case for admin review
   */
  async flagCase(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { caseId } = req.params;

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
      const { caseId } = req.params;
      const { decision } = req.body; // "APPROVED" | "REJECTED"

      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        res.status(400).json({ error: 'Decision must be APPROVED or REJECTED.' });
        return;
      }

      const found = await prisma.case.findUnique({ where: { id: caseId } });
      if (!found) { res.status(404).json({ error: 'Case not found.' }); return; }

      const updated = await prisma.case.update({
        where: { id: caseId },
        data: { status: decision },
      });
      res.json({ case: updated });
    } catch (err) {
      console.error('[CaseController.makeDecision]', err);
      res.status(500).json({ error: 'Failed to record decision.' });
    }
  }
}
