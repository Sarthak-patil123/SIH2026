import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { validateRegister, validateLogin } from "./auth.validation";

export class AuthController {
  /**
   * POST /api/auth/register
   * Body: { email, password, role? }
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = validateRegister(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: validation.errors });
      }

      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (err: unknown) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = validateLogin(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: validation.errors });
      }

      const result = await authService.login(req.body);
      return res.status(200).json(result);
    } catch (err: unknown) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile (requires auth middleware).
   */
  async me(req: Request & { user?: { userId: string; email: string; role: string } }, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    return res.status(200).json({ user: req.user });
  }
}

export const authController = new AuthController();
