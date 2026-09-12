import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { config } from '../../config';
import { LoginDTO, RegisterRequest, AuthUserResponse, JWTPayload, LoginResponse } from './auth.types';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Fallback demo users — used when PostgreSQL is unavailable (demo/hackathon mode)
// ---------------------------------------------------------------------------
interface FallbackUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
}

const FALLBACK_USERS: FallbackUser[] = [
  {
    id: 'officer-1',
    email: 'officer@ssb.gov.in',
    name: 'Rajesh Kumar',
    role: Role.OFFICER,
    password: 'password123',
  },
  {
    id: 'admin-1',
    email: 'admin@ssb.gov.in',
    name: 'Anil Sharma',
    role: Role.ADMIN,
    password: 'password123',
  },
];

function signToken(user: AuthUserResponse): string {
  const payload: JWTPayload = {
    sub: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export class AuthService {
  async register(dto: RegisterRequest): Promise<LoginResponse> {
    const email = dto.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (existing) {
      throw new AuthError('Email already registered.', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role && ['ADMIN', 'admin'].includes(dto.role) ? Role.ADMIN : Role.OFFICER;
    const name = dto.name || email.split('@')[0];

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return { user: created, token: signToken(created) };
  }

  async login(dto: LoginDTO): Promise<LoginResponse> {
    const email = dto.email.toLowerCase().trim();

    // --- Try database (Prisma/PostgreSQL) ---
    let dbUser: { id: string; email: string; name: string; role: Role; passwordHash: string | null } | null = null;
    let dbAvailable = false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = await (prisma.user as any).findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true, passwordHash: true },
      });
      dbUser = found as { id: string; email: string; name: string; role: Role; passwordHash: string | null } | null;
      dbAvailable = true;
    } catch {
      console.warn('[AuthService] Database unavailable — using fallback demo users.');
    }

    if (dbAvailable) {
      if (!dbUser) throw new AuthError('Invalid email or password.', 401);
      if (!dbUser.passwordHash) throw new AuthError('Account not configured for password login.', 401);

      const valid = await bcrypt.compare(dto.password, dbUser.passwordHash);
      if (!valid) throw new AuthError('Invalid email or password.', 401);

      const authUser: AuthUserResponse = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      };
      return { user: authUser, token: signToken(authUser) };
    }

    // --- Fallback demo users (DB offline) ---
    const fallback = FALLBACK_USERS.find((u) => u.email === email);
    if (!fallback || fallback.password !== dto.password) {
      throw new AuthError('Invalid email or password.', 401);
    }

    const authUser: AuthUserResponse = {
      id: fallback.id,
      email: fallback.email,
      name: fallback.name,
      role: fallback.role,
    };
    return { user: authUser, token: signToken(authUser) };
  }
}

export const authService = new AuthService();

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}
