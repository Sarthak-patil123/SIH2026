import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * requireRole(...roles) — Guards a route to only allow the specified roles.
 * Must be used AFTER the `authenticate` middleware.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Insufficient permissions. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}

// Convenience aliases
export const requireOfficer = requireRole(Role.OFFICER);
export const requireAdmin = requireRole(Role.ADMIN);
