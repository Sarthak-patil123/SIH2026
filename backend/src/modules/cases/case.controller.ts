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
      const { title, description, riskLevel, riskScore, personName, status, documents, flagReason, officerObservations } = req.body;

      if (!title) {
        res.status(400).json({ error: 'Title is required.' });
        return;
      }

      const caseStatus = status === 'FLAGGED' ? CaseStatus.FLAGGED : CaseStatus.PENDING;
      const assignedOfficerId = user?.id || req.body.assignedTo || req.body.officerId;

      if (!assignedOfficerId) {
        res.status(400).json({ error: 'Officer ID is required.' });
        return;
      }

      const calculatedRiskLevel =
        (riskLevel as RiskLevel) ||
        (riskScore !== undefined && Number(riskScore) > 60
          ? RiskLevel.HIGH
          : riskScore !== undefined && Number(riskScore) > 30
          ? RiskLevel.MEDIUM
          : RiskLevel.LOW);

      const created = await prisma.case.create({
        data: {
          title,
          personName: personName || 'Unknown Subject',
          riskLevel: calculatedRiskLevel,
          riskScore: riskScore !== undefined ? Number(riskScore) : 10.0,
          officerId: assignedOfficerId,
          status: caseStatus,
          ...(documents && Array.isArray(documents) && documents.length > 0
            ? {
                documents: {
                  create: documents.map((d: any) => ({
                    fileName: d.fileName || 'document.jpg',
                    fileUrl: d.fileUrl || '/storage/default.jpg',
                    docType: d.docType || 'UNKNOWN',
                    sha256Hash: d.sha256Hash || 'pending-hash',
                    ocrConfidence: d.ocrConfidence !== undefined && d.ocrConfidence !== null ? Number(d.ocrConfidence) : null,
                    ocrData: d.ocrData || null,
                    faceResult: d.faceResult || null,
                    tamperResult: d.tamperResult || null,
                  })),
                },
              }
            : {}),
          auditLogs: {
            create: [
              {
                action: caseStatus === CaseStatus.FLAGGED ? 'CASE_FLAGGED' : 'CASE_CREATED',
                actorId: assignedOfficerId,
                details: {
                  title,
                  personName: personName || 'Unknown Subject',
                  riskScore,
                  flagReason: flagReason || null,
                  officerObservations: officerObservations || null,
                },
                eventHash: Buffer.from(`${Date.now()}-${assignedOfficerId}`).toString('hex'),
              },
            ],
          },
        },
        include: {
          documents: true,
          auditLogs: true,
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
        include: {
          officer: { select: { id: true, name: true, email: true } },
          documents: true,
        },
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
   * GET /api/cases/activity
   * Returns dynamic recent activity events from audit logs & cases for the sidebar
   */
  async getRecentActivity(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
      const caseWhere = user?.role === Role.OFFICER ? { officerId: user.id } : {};

      // 1. Check for real audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: user?.role === Role.OFFICER ? { case: { officerId: user.id } } : {},
        take: limit * 2,
        orderBy: { createdAt: 'desc' },
        include: {
          case: {
            select: {
              id: true,
              personName: true,
              status: true,
              riskLevel: true,
            },
          },
        },
      });

      let activities: any[] = [];

      if (auditLogs.length > 0) {
        activities = auditLogs.map((log) => {
          const caseRef = 'SSB-' + log.caseId.slice(0, 6).toUpperCase();
          const subject = log.case?.personName || 'Applicant';
          let description = '';
          let type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' = 'INFO';

          switch (log.action) {
            case 'CASE_FLAGGED':
              description = `Case ${caseRef} flagged for review`;
              type = 'WARNING';
              break;
            case 'CASE_CREATED':
              description = `Verification initiated for ${subject} (${caseRef})`;
              type = 'INFO';
              break;
            case 'DOCUMENT_UPLOADED':
              description = `Document uploaded for ${subject} (${caseRef})`;
              type = 'INFO';
              break;
            case 'DECISION_APPROVED':
              description = `Case ${caseRef} approved & verified`;
              type = 'SUCCESS';
              break;
            case 'DECISION_REJECTED':
              description = `Decision recorded: ${caseRef} REJECTED`;
              type = 'DANGER';
              break;
            default:
              description = `${log.action.replace(/_/g, ' ')} (${caseRef})`;
              type = log.case?.riskLevel === RiskLevel.HIGH ? 'DANGER' : 'INFO';
              break;
          }

          return {
            id: log.id,
            caseId: log.caseId,
            caseNumber: caseRef,
            applicantName: subject,
            action: log.action,
            time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            description,
            type,
            createdAt: log.createdAt,
          };
        });
      }

      // If audit logs are fewer than requested limit, supplement with recent cases
      if (activities.length < limit) {
        const recentCases = await prisma.case.findMany({
          where: caseWhere,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { documents: true },
        });

        for (const c of recentCases) {
          const caseRef = 'SSB-' + c.id.slice(0, 6).toUpperCase();
          const alreadyLogged = activities.some((a) => a.caseId === c.id || a.description.includes(caseRef));
          if (!alreadyLogged) {
            let type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' = 'INFO';
            let description = '';

            if (c.status === CaseStatus.APPROVED) {
              description = `Case ${caseRef} approved (${c.personName})`;
              type = 'SUCCESS';
            } else if (c.status === CaseStatus.REJECTED) {
              description = `Case ${caseRef} rejected (${c.personName})`;
              type = 'DANGER';
            } else if (c.status === CaseStatus.FLAGGED || c.riskLevel === RiskLevel.HIGH) {
              description = `Case ${caseRef} flagged for review (${c.personName})`;
              type = 'WARNING';
            } else {
              description = `Verification file opened for ${c.personName} (${caseRef})`;
              type = 'INFO';
            }

            activities.push({
              id: 'case-' + c.id,
              caseId: c.id,
              caseNumber: caseRef,
              applicantName: c.personName,
              action: c.status,
              time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              description,
              type,
              createdAt: c.createdAt,
            });
          }
        }
      }

      // Sort activities descending by creation timestamp
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ activities: activities.slice(0, limit) });
    } catch (err) {
      console.error('[CaseController.getRecentActivity]', err);
      if (next) next(err);
      else res.status(500).json({ error: 'Failed to retrieve recent activity.' });
    }
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
