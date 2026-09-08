// Extends Express Request to include the authenticated user
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: Role;
      };
    }
  }
}
