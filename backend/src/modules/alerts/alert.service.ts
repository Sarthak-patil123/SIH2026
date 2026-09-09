import { alertRepository, AlertRepository } from "./alert.repository";
import { AlertRecord, CreateAlertRequest, UpdateAlertRequest, AlertSeverity, AlertStatus } from "./alert.types";

export class AlertService {
  constructor(private readonly repo: AlertRepository = alertRepository) {}

  async createAlert(data: CreateAlertRequest): Promise<AlertRecord> {
    if (!data.title?.trim() || !data.message?.trim()) {
      const err = Object.assign(new Error("Alert title and message are required"), { status: 400 });
      throw err;
    }
    return this.repo.create(data);
  }

  async getAlertById(id: string): Promise<AlertRecord> {
    const record = await this.repo.findById(id);
    if (!record) {
      const err = Object.assign(new Error(`Alert with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return record;
  }

  async listAlerts(filters?: { status?: AlertStatus; severity?: AlertSeverity; caseId?: string }): Promise<AlertRecord[]> {
    return this.repo.findAll(filters);
  }

  async markAsRead(id: string): Promise<AlertRecord> {
    const updated = await this.repo.update(id, { status: "read" });
    if (!updated) {
      const err = Object.assign(new Error(`Alert with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return updated;
  }

  async updateAlert(id: string, updates: UpdateAlertRequest): Promise<AlertRecord> {
    const updated = await this.repo.update(id, updates);
    if (!updated) {
      const err = Object.assign(new Error(`Alert with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return updated;
  }

  async deleteAlert(id: string): Promise<{ success: boolean }> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      const err = Object.assign(new Error(`Alert with ID ${id} not found`), { status: 404 });
      throw err;
    }
    return { success: true };
  }
}

export const alertService = new AlertService();
