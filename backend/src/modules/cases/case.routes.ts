import { Router } from "express";
import { caseController } from "./case.controller";

export const caseRoutes = Router();

// POST /api/cases - Create a new case
caseRoutes.post("/", (req, res, next) => caseController.createCase(req, res, next));

// GET /api/cases - List all cases with optional filters (?status=...&priority=...)
caseRoutes.get("/", (req, res, next) => caseController.listCases(req, res, next));

// GET /api/cases/:id - Get case by ID
caseRoutes.get("/:id", (req, res, next) => caseController.getCaseById(req, res, next));

// PATCH /api/cases/:id - Update case fields
caseRoutes.patch("/:id", (req, res, next) => caseController.updateCase(req, res, next));

// DELETE /api/cases/:id - Delete a case
caseRoutes.delete("/:id", (req, res, next) => caseController.deleteCase(req, res, next));
