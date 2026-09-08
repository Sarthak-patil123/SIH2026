import { Request, Response } from 'express';
import { AuthService, AuthError } from './auth.service';
import { LoginDTO } from './auth.types';
import { config } from '../../config';

const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
};

export class AuthController {
  /**
   * POST /api/auth/login
   * Body: { email: string; password: string }
   */
  async login(req: Request, res: Response): Promise<void> {
    const dto: LoginDTO = req.body;

    if (!dto.email || !dto.password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    try {
      const { user, token } = await authService.login(dto);

      // Set JWT as HttpOnly cookie
      res.cookie('token', token, COOKIE_OPTIONS);

      res.status(200).json({
        user,
        token, // also return in body for API clients
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        console.error('[AuthController.login] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error. Please try again.' });
      }
    }
  }

  /**
   * GET /api/auth/me  (protected by authenticate middleware)
   * Returns the current authenticated user from req.user
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
   * Clears the HttpOnly cookie
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
