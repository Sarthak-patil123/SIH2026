import crypto from "crypto";
import { AlertRecord, CreateAlertRequest, UpdateAlertRequest, AlertSeverity, AlertStatus } from "./alert.types";

/**
 * Repository for alert notifications.
 * Backed by an in-memory Map; structure is ready to swap for Prisma client calls.
 */
export class AlertRepository {
  private readonly store = new Map<string, AlertRecord>();

  async create(data: CreateAlertRequest): Promise<AlertRecord> {
    const now = new Date().toISOString();
    const record: AlertRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      message: data.message,
      severity: data.severity ?? "medium",
      status: "unread",
      caseId: data.caseId,
      documentId: data.documentId,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<AlertRecord | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(filters?: { status?: AlertStatus; severity?: AlertSeverity; caseId?: string }): Promise<AlertRecord[]> {
    let records = Array.from(this.store.values());
    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.severity) {
      records = records.filter((r) => r.severity === filters.severity);
    }
    if (filters?.caseId) {
      records = records.filter((r) => r.caseId === filters.caseId);
    }
    return records;
  }

  async update(id: string, updates: UpdateAlertRequest): Promise<AlertRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: AlertRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

export const alertRepository = new AlertRepository();
