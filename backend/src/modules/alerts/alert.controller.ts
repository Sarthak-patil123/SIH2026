import { Request, Response, NextFunction } from "express";
import { alertService } from "./alert.service";
import { AlertSeverity, AlertStatus } from "./alert.types";

export class AlertController {
  async createAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertService.createAlert(req.body);
      return res.status(201).json(alert);
    } catch (err) {
      next(err);
    }
  }

  async listAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, severity, caseId } = req.query;
      const alerts = await alertService.listAlerts({
        status: status as AlertStatus | undefined,
        severity: severity as AlertSeverity | undefined,
        caseId: caseId as string | undefined,
      });
      return res.status(200).json(alerts);
    } catch (err) {
      next(err);
    }
  }

  async getAlertById(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertService.getAlertById(req.params.id);
      return res.status(200).json(alert);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertService.markAsRead(req.params.id);
      return res.status(200).json(alert);
    } catch (err) {
      next(err);
    }
  }

  async updateAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertService.updateAlert(req.params.id, req.body);
      return res.status(200).json(alert);
    } catch (err) {
      next(err);
    }
  }

  async deleteAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await alertService.deleteAlert(req.params.id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const alertController = new AlertController();
