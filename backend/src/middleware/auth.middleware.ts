import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { JWTPayload } from '../modules/auth/auth.types';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // 1. Read token from HttpOnly cookie or Authorization header
  let token: string | undefined;

  if (req.cookies?.token) {
    token = req.cookies.token as string;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  // 2. Verify JWT signature
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}
