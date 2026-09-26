import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { JWTPayload } from '../modules/auth/auth.types';

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
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
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
    };
  } catch {
    // Ignore invalid token in optional mode
  }
  next();
}
