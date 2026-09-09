import { RegisterRequest, LoginRequest } from "./auth.types";

interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["admin", "officer", "viewer"] as const;

export function validateRegister(body: Partial<RegisterRequest>): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  if (!body.email || !EMAIL_RE.test(body.email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }
  if (!body.password || body.password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters." });
  }
  if (body.role && !VALID_ROLES.includes(body.role as (typeof VALID_ROLES)[number])) {
    errors.push({ field: "role", message: `Role must be one of: ${VALID_ROLES.join(", ")}.` });
  }

  return { valid: errors.length === 0, errors };
}

export function validateLogin(body: Partial<LoginRequest>): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  if (!body.email) {
    errors.push({ field: "email", message: "Email is required." });
  }
  if (!body.password) {
    errors.push({ field: "password", message: "Password is required." });
  }

  return { valid: errors.length === 0, errors };
}
