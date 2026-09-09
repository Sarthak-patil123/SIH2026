import { Request, Response, NextFunction } from "express";
import { caseService } from "./case.service";
import { CaseStatus, CasePriority } from "./case.types";

export class CaseController {
  async createCase(req: Request, res: Response, next: NextFunction) {
    try {
      const caseRecord = await caseService.createCase(req.body);
      return res.status(201).json(caseRecord);
    } catch (err) {
      next(err);
    }
  }

  async listCases(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority } = req.query;
      const cases = await caseService.listCases({
        status: status as CaseStatus | undefined,
        priority: priority as CasePriority | undefined,
      });
      return res.status(200).json(cases);
    } catch (err) {
      next(err);
    }
  }

  async getCaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const caseRecord = await caseService.getCaseById(req.params.id);
      return res.status(200).json(caseRecord);
    } catch (err) {
      next(err);
    }
  }

  async updateCase(req: Request, res: Response, next: NextFunction) {
    try {
      const caseRecord = await caseService.updateCase(req.params.id, req.body);
      return res.status(200).json(caseRecord);
    } catch (err) {
      next(err);
    }
  }

  async deleteCase(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await caseService.deleteCase(req.params.id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const caseController = new CaseController();
