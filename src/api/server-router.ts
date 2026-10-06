import { Router, Request, Response } from 'express';
import { questionDb } from '../lib/database/index.ts';
import { aiService } from '../lib/ai/index.ts';
import { QuestionStatus } from '../types/question.ts';

export const apiRouter = Router();

// -------------------------------------------------------------
// POST /api/questions - Submit a new student question
// -------------------------------------------------------------
apiRouter.post('/questions', (req: Request, res: Response) => {
  try {
    const { question, source, sessionId, category } = req.body || {};

    if (!question || typeof question !== 'string') {
      res.status(400).json({ success: false, error: 'Question content is required' });
      return;
    }

    const trimmed = question.trim();
    if (trimmed.length < 3) {
      res.status(400).json({ success: false, error: 'Question is too short (min 3 chars)' });
      return;
    }

    if (trimmed.length > 2000) {
      res.status(400).json({ success: false, error: 'Question exceeds maximum limit of 2000 chars' });
      return;
    }

    // Check for rapid identical duplicate within the same session
    const recent = questionDb.getAll({ sessionId });
    const duplicate = recent.slice(0, 5).find(
      (q) => q.question.toLowerCase() === trimmed.toLowerCase() &&
             Date.now() - new Date(q.createdAt).getTime() < 30000
    );

    if (duplicate) {
      res.status(409).json({
        success: false,
        error: 'Duplicate submission detected',
        question: duplicate,
      });
      return;
    }

    const created = questionDb.create({
      question: trimmed,
      source: source || 'qr',
      sessionId: sessionId || 'lecture-101',
      category,
    });

    // Forward to secondary dashboard API if configured
    const secondaryApiUrl = process.env.SECONDARY_DASHBOARD_API_URL || req.body.secondaryApiUrl;
    if (secondaryApiUrl) {
      try {
        fetch(secondaryApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: created.id,
            question: created.question,
            source: created.source,
            sessionId: created.sessionId,
            createdAt: created.createdAt,
          }),
        }).catch((fErr) => {
          console.warn('Failed forwarding to secondary dashboard API:', fErr);
        });
      } catch (err) {
        console.warn('Could not initiate secondary dashboard forward:', err);
      }
    }

    res.status(201).json({
      success: true,
      question: created,
      forwardedToSecondaryDashboard: Boolean(secondaryApiUrl),
    });
  } catch (err: unknown) {
    console.error('Error in POST /api/questions:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// GET /api/questions - List questions with optional filtering
// -------------------------------------------------------------
apiRouter.get('/questions', (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.sessionId as string) || undefined;
    const status = (req.query.status as QuestionStatus) || undefined;
    const search = (req.query.search as string) || undefined;

    const questions = questionDb.getAll({ sessionId, status, search });
    const stats = questionDb.getStats(sessionId);

    res.json({
      success: true,
      questions,
      stats,
      sessionId,
    });
  } catch (err: unknown) {
    console.error('Error in GET /api/questions:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// GET /api/questions/stream - SSE real-time stream endpoint
// -------------------------------------------------------------
apiRouter.get('/questions/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering for NGINX/Cloud proxies
  });

  // Send initial connection packet
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Subscribe to changes in Question database
  const unsubscribe = questionDb.subscribe((event) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // client connection likely terminated
    }
  });

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// -------------------------------------------------------------
// GET /api/questions/:id - Fetch single question
// -------------------------------------------------------------
apiRouter.get('/questions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const question = questionDb.getById(id);

  if (!question) {
    res.status(404).json({ success: false, error: 'Question not found' });
    return;
  }

  res.json({ success: true, question });
});

// -------------------------------------------------------------
// PATCH /api/questions/:id - Update question status or notes
// -------------------------------------------------------------
apiRouter.patch('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, lecturerNotes, upvotes } = req.body || {};

    const updated = questionDb.update(id, {
      status,
      lecturerNotes,
      upvotes,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Question not found' });
      return;
    }

    res.json({ success: true, question: updated });
  } catch (err: unknown) {
    console.error('Error in PATCH /api/questions/:id:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// DELETE /api/questions/:id - Delete a question
// -------------------------------------------------------------
apiRouter.delete('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = questionDb.delete(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Question not found' });
      return;
    }

    res.json({ success: true, message: 'Question deleted' });
  } catch (err: unknown) {
    console.error('Error in DELETE /api/questions/:id:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// POST /api/ai/chat - AI Question Formulation Assistant
// -------------------------------------------------------------
apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, sessionId, language } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'Messages array is required' });
      return;
    }

    const response = await aiService.chat({
      messages,
      sessionId: sessionId || 'default-session',
      language: language === 'en' ? 'en' : 'ar',
    });

    res.json(response);
  } catch (err: unknown) {
    console.error('Error in POST /api/ai/chat:', err);
    res.status(500).json({
      success: false,
      message: 'AI assistant error. You can still formulate and send your question manually below.',
      error: 'AI_INTERNAL_ERROR',
      provider: 'fallback',
    });
  }
});

// -------------------------------------------------------------
// GET /api/health - Health check and system info
// -------------------------------------------------------------
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfig: {
      provider: aiService.getConfig().provider,
      model: aiService.getConfig().model,
      rateLimitMax: aiService.getConfig().maxRequestsPerSession,
    },
  });
});
