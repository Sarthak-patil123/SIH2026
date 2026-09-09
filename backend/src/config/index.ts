import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'sih2026-secure-jwt-secret-key-32chars',
  jwtExpiresIn: '24h' as const,
  databaseUrl: process.env.DATABASE_URL || '',
};
