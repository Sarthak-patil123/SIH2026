import { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from './auth.service';
import { LoginDTO, RegisterRequest } from './auth.types';
import { validateLogin, validateRegister } from './auth.validation';
import { config } from '../../config';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
};

export class AuthController {
  /**
   * POST /api/auth/register
   * Body: { email: string; password: string; role?: string }
   */
  async register(req: Request, res: Response, next?: NextFunction): Promise<void> {
    const validation = validateRegister(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }

    try {
      const dto: RegisterRequest = req.body;
      const result = await authService.register(dto);
      res.cookie('token', result.token, COOKIE_OPTIONS);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
      } else if (next) {
        next(err);
      } else {
        res.status(500).json({ error: 'Failed to register user.' });
      }
    }
  }

  /**
   * POST /api/auth/login
   * Body: { email: string; password: string }
   */
  async login(req: Request, res: Response, next?: NextFunction): Promise<void> {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }

    try {
      const dto: LoginDTO = req.body;
      const result = await authService.login(dto);

      // Set JWT as HttpOnly cookie
      res.cookie('token', result.token, COOKIE_OPTIONS);

      res.status(200).json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
      } else if (next) {
        next(err);
      } else {
        console.error('[AuthController.login] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error. Please try again.' });
      }
    }
  }

  /**
   * GET /api/auth/me (protected by authenticate middleware)
   */
  me(req: Request, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    res.status(200).json({ user: req.user });
  }

  /**
   * POST /api/auth/logout
   */
  logout(_req: Request, res: Response): void {
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
    });
    res.status(200).json({ message: 'Logged out successfully.' });
  }
}

export const authController = new AuthController();
