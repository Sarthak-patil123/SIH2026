import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

export const authRoutes = Router();
const ctrl = new AuthController();

// POST /api/auth/login
authRoutes.post('/login', (req, res) => ctrl.login(req, res));

// GET /api/auth/me  — requires valid JWT
authRoutes.get('/me', authenticate, (req, res) => ctrl.me(req, res));

// POST /api/auth/logout
authRoutes.post('/logout', (req, res) => ctrl.logout(req, res));
