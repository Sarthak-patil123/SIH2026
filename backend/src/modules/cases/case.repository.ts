import crypto from "crypto";
import { CaseRecord, CreateCaseRequest, UpdateCaseRequest, CaseStatus, CasePriority } from "./case.types";

/**
 * Repository for case records.
 * Backed by an in-memory Map; structure is ready to swap for Prisma client
 * calls once the database is provisioned.
 */
export class CaseRepository {
  private readonly store = new Map<string, CaseRecord>();

  async create(data: CreateCaseRequest): Promise<CaseRecord> {
    const now = new Date().toISOString();
    const record: CaseRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: "open",
      priority: data.priority ?? "medium",
      assignedTo: data.assignedTo,
      documentId: data.documentId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<CaseRecord | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(filters?: { status?: CaseStatus; priority?: CasePriority }): Promise<CaseRecord[]> {
    let records = Array.from(this.store.values());
    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.priority) {
      records = records.filter((r) => r.priority === filters.priority);
    }
    return records;
  }

  async update(id: string, updates: UpdateCaseRequest): Promise<CaseRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: CaseRecord = {
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

export const caseRepository = new CaseRepository();
