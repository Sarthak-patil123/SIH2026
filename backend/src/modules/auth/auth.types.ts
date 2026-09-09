import { Role } from '@prisma/client';

export interface LoginDTO {
  email: string;
  password: string;
}

export type LoginRequest = LoginDTO;

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  role?: 'OFFICER' | 'ADMIN' | 'admin' | 'officer' | 'viewer';
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'officer' | 'viewer' | Role;
  createdAt: string;
}

export interface JWTPayload {
  sub: string;        // user id
  userId?: string;
  email: string;
  name: string;
  role: Role;
}

export type AuthTokenPayload = JWTPayload;

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  user: AuthUserResponse;
  token: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUserResponse | Omit<UserRecord, 'passwordHash'>;
}
