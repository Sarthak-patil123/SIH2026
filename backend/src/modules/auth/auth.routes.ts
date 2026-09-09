import { Router } from "express";
import { authController } from "./auth.controller";

export const authRoutes = Router();

// POST /api/auth/register — create a new user account
authRoutes.post("/register", (req, res, next) =>
  authController.register(req, res, next)
);

// POST /api/auth/login — authenticate and receive a JWT
authRoutes.post("/login", (req, res, next) =>
  authController.login(req, res, next)
);

// GET /api/auth/me — return current user info (protected by auth middleware when added)
authRoutes.get("/me", (req, res) =>
  authController.me(req as any, res)
);
