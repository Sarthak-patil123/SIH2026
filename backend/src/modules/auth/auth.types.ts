export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "officer" | "viewer";
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: "admin" | "officer" | "viewer";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRecord["role"];
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  token: string;
  user: Omit<UserRecord, "passwordHash">;
}
