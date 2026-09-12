import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

export const authRoutes = Router();

// POST /api/auth/register — create a new user account
authRoutes.post('/register', (req, res, next) =>
  authController.register(req, res, next)
);

// POST /api/auth/login — authenticate and receive a JWT
authRoutes.post('/login', (req, res, next) =>
  authController.login(req, res, next)
);

// GET /api/auth/me — requires valid JWT
authRoutes.get('/me', authenticate, (req, res) =>
  authController.me(req, res)
);

// POST /api/auth/logout — clears the session cookie
authRoutes.post('/logout', (req, res) =>
  authController.logout(req, res)
);
