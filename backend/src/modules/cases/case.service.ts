import { caseRepository, CaseRepository } from "./case.repository";
import { CaseRecord, CreateCaseRequest, UpdateCaseRequest, CaseStatus, CasePriority } from "./case.types";

export class CaseService {
  constructor(private readonly repo: CaseRepository = caseRepository) {}

  async createCase(data: CreateCaseRequest): Promise<CaseRecord> {
    if (!data.title?.trim()) {
      const err = Object.assign(new Error("Case title is required"), { status: 400 });
      throw err;
    }
    return this.repo.create(data);
  }

  async getCaseById(id: string): Promise<CaseRecord> {
    const record = await this.repo.findById(id);
    if (!record) {
      const err = Object.assign(new Error(`Case with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return record;
  }

  async listCases(filters?: { status?: CaseStatus; priority?: CasePriority }): Promise<CaseRecord[]> {
    return this.repo.findAll(filters);
  }

  async updateCase(id: string, updates: UpdateCaseRequest): Promise<CaseRecord> {
    const updated = await this.repo.update(id, updates);
    if (!updated) {
      const err = Object.assign(new Error(`Case with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return updated;
  }

  async deleteCase(id: string): Promise<{ success: boolean }> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      const err = Object.assign(new Error(`Case with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return { success: true };
  }
}

export const caseService = new CaseService();
