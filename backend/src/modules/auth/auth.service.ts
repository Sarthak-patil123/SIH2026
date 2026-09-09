import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/env";
import {
  UserRecord,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  AuthTokenPayload,
} from "./auth.types";

/**
 * Auth service — JWT-based registration and login.
 *
 * NOTE: Uses an in-memory user store until Prisma User model is set up.
 * To switch to Prisma: replace the `users` Map with prisma.user.create / findUnique calls.
 */
export class AuthService {
  /** In-memory user store — replace with Prisma once schema is ready. */
  private readonly users = new Map<string, UserRecord>();
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn = "8h";

  constructor() {
    this.jwtSecret = config.jwtSecret;
  }

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const existing = [...this.users.values()].find(
      (u) => u.email === payload.email
    );
    if (existing) {
      const err = Object.assign(new Error("Email already registered"), {
        status: 409,
      });
      throw err;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const id = crypto.randomUUID();
    const user: UserRecord = {
      id,
      email: payload.email,
      passwordHash,
      role: payload.role ?? "officer",
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);

    const token = this._signToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const user = [...this.users.values()].find(
      (u) => u.email === payload.email
    );
    if (!user) {
      const err = Object.assign(new Error("Invalid credentials"), {
        status: 401,
      });
      throw err;
    }

    const passwordMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatch) {
      const err = Object.assign(new Error("Invalid credentials"), {
        status: 401,
      });
      throw err;
    }

    const token = this._signToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
  }

  private _signToken(user: UserRecord): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }
}

export const authService = new AuthService();
