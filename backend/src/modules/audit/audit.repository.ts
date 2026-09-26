import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditRepository {
  /**
   * Create an audit log entry in PostgreSQL
   */
  async createAuditLog(data: {
    caseId: string;
    action: string;
    actorId: string;
    details: any;
    eventHash: string;
    txId?: string | null;
    blockNumber?: number | null;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          caseId: data.caseId,
          action: data.action,
          actorId: data.actorId,
          details: data.details,
          eventHash: data.eventHash,
          txId: data.txId || null,
          blockNumber: data.blockNumber || null,
        },
      });
    } catch (err) {
      console.warn('[AuditRepository.createAuditLog] Prisma create fallback/ignore:', (err as any)?.message);
      return {
        id: `mock-${Date.now()}`,
        caseId: data.caseId,
        action: data.action,
        actorId: data.actorId,
        details: data.details,
        eventHash: data.eventHash,
        txId: data.txId || null,
        blockNumber: data.blockNumber || null,
        createdAt: new Date(),
      };
    }
  }

  /**
   * Find audit logs by caseId
   */
  async findLogsByCaseId(caseId: string) {
    try {
      return await prisma.auditLog.findMany({
        where: { caseId },
        orderBy: { createdAt: 'asc' },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              personName: true,
              status: true,
              riskLevel: true,
              riskScore: true,
            },
          },
        },
      });
    } catch (err) {
      console.warn('[AuditRepository.findLogsByCaseId] DB Query fallback:', (err as any)?.message);
      return [];
    }
  }

  /**
   * Find all audit logs across cases
   */
  async findAllLogs(limit: number = 100) {
    try {
      return await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              personName: true,
              status: true,
              riskLevel: true,
            },
          },
        },
      });
    } catch (err) {
      console.warn('[AuditRepository.findAllLogs] DB Query fallback:', (err as any)?.message);
      return [];
    }
  }
}

export const auditRepository = new AuditRepository();
