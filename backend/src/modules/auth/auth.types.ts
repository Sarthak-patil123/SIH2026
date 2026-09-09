import { Role } from '@prisma/client';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface JWTPayload {
  sub: string;        // user id
  email: string;
  name: string;
  role: Role;
}

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
