import { Router } from "express";
import { alertController } from "./alert.controller";

export const alertRoutes = Router();

// POST /api/alerts - Create a new alert
alertRoutes.post("/", (req, res, next) => alertController.createAlert(req, res, next));

// GET /api/alerts - List all alerts with optional filters (?status=...&severity=...&caseId=...)
alertRoutes.get("/", (req, res, next) => alertController.listAlerts(req, res, next));

// GET /api/alerts/:id - Get alert by ID
alertRoutes.get("/:id", (req, res, next) => alertController.getAlertById(req, res, next));

// PATCH /api/alerts/:id/read - Mark alert as read
alertRoutes.patch("/:id/read", (req, res, next) => alertController.markAsRead(req, res, next));

// PATCH /api/alerts/:id - Update alert status or severity
alertRoutes.patch("/:id", (req, res, next) => alertController.updateAlert(req, res, next));

// DELETE /api/alerts/:id - Delete an alert
alertRoutes.delete("/:id", (req, res, next) => alertController.deleteAlert(req, res, next));
