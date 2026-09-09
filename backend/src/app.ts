import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { caseRoutes } from './modules/cases/case.routes';
import { documentRoutes } from './modules/documents/document.routes';
import { alertRoutes } from './modules/alerts/alert.routes';
import { chatbotRoutes } from './modules/chatbot/chatbot.routes';

export const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true, // allow cookies to be sent cross-origin
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/chatbot', chatbotRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);
