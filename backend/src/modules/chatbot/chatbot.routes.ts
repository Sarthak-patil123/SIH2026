import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';

export const chatbotRoutes = Router();

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:5100';

/**
 * POST /api/chatbot/ask
 * Admin-only. Proxies the question to the Python LangChain text-to-SQL service.
 */
chatbotRoutes.post(
  '/ask',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { question } = req.body as { question?: string };

    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'Missing or empty "question" in request body.' });
      return;
    }

    try {
      const upstream = await fetch(`${CHATBOT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
        // 120-second timeout — allows for rate-limit retries if needed
        signal: AbortSignal.timeout(120_000),
      });

      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({ error: 'Chatbot service error' }));
        res.status(502).json({ error: (err as { error?: string }).error ?? 'Chatbot service error' });
        return;
      }

      const data = await upstream.json() as { answer?: string; error?: string };
      res.json({ answer: data.answer ?? '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
        res.status(503).json({
          error: 'Chatbot service is offline. Start it with: python agent.py --serve',
        });
        return;
      }

      if (message.includes('TimeoutError') || message.includes('abort')) {
        res.status(504).json({ error: 'Chatbot service timed out. Try again.' });
        return;
      }

      res.status(500).json({ error: `Internal error: ${message}` });
    }
  }
);
