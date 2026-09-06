import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { caseRoutes } from "./modules/cases/case.routes";
import { documentRoutes } from "./modules/documents/document.routes";
import { alertRoutes } from "./modules/alerts/alert.routes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/alerts", alertRoutes);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);
