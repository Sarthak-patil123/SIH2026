export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateRegister(body: any): ValidationResult {
  const errors: string[] = [];
  if (!body?.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    errors.push('A valid email address is required.');
  }
  if (!body?.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateLogin(body: any): ValidationResult {
  const errors: string[] = [];
  if (!body?.email || typeof body.email !== 'string') {
    errors.push('Email is required.');
  }
  if (!body?.password || typeof body.password !== 'string') {
    errors.push('Password is required.');
  }
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
