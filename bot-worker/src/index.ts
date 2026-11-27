import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { z } from 'zod';
import { BotJobSession } from './runBot';

dotenv.config();

const app = express();
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[HTTP ${req.method}] ${req.url}`);
  next();
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const WORKER_SECRET = process.env.WORKER_SECRET || 'autosync-bot-secret';

// In-memory active bot sessions
const activeSessions = new Map<string, BotJobSession>();

// Secret validation middleware
function requireAuth(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (WORKER_SECRET && WORKER_SECRET !== 'change-me' && token !== WORKER_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid WORKER_SECRET' });
  }
  next();
}

const jobSchema = z.object({
  meeting_id: z.string().min(1, 'meeting_id is required'),
  meeting_url: z.string().url('meeting_url must be a valid URL'),
  bot_name: z.string().optional(),
});

// Root Dashboard & Status
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AutoSync Meet - Bot Worker</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080A10; color: #E2E8F0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #0E121D; border: 1px solid #1E2538; border-radius: 16px; padding: 36px; max-width: 500px; width: 100%; box-shadow: 0 12px 32px rgba(0,0,0,0.5); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); color: #4ADE80; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        .dot { width: 8px; height: 8px; background: #22C55E; border-radius: 50%; box-shadow: 0 0 8px #22C55E; }
        h1 { font-size: 22px; margin: 0 0 8px 0; color: #FFFFFF; }
        p { color: #94A3B8; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5; }
        .stat-grid { background: #080A10; border: 1px solid #171D2D; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
        .stat-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #111624; }
        .stat-row:last-child { border-bottom: none; }
        .label { color: #64748B; }
        .val { color: #F1F5F9; font-weight: 500; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><span class="dot"></span> Worker Online & Ready</div>
        <h1>AutoSync Meet Bot Worker</h1>
        <p>This background service joins Google Meet calls via Chromium, captures live captions, and delivers transcripts to AutoSync Meet.</p>
        <div class="stat-grid">
          <div class="stat-row"><span class="label">Bot Display Name:</span><span class="val">${process.env.BOT_NAME || 'My Own Bot'}</span></div>
          <div class="stat-row"><span class="label">Port:</span><span class="val">${PORT}</span></div>
          <div class="stat-row"><span class="label">Active Sessions:</span><span class="val">${activeSessions.size}</span></div>
          <div class="stat-row"><span class="label">Webhook Target:</span><span class="val">${process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/own-bot'}</span></div>
          <div class="stat-row"><span class="label">Uptime:</span><span class="val">${Math.round(process.uptime())}s</span></div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'autosync-meet-bot-worker',
    activeSessionsCount: activeSessions.size,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// List Active Jobs
app.get('/jobs', requireAuth, (_req: Request, res: Response) => {
  const jobs = Array.from(activeSessions.values()).map((s) => ({
    jobId: s.jobId,
    meetingId: s.meetingId,
    isRunning: s.isRunning,
  }));
  res.json({ success: true, count: jobs.length, jobs });
});

// Dispatch / Spawn a Bot
app.post('/jobs', requireAuth, (req: Request, res: Response) => {
  try {
    const { meeting_id, meeting_url, bot_name } = jobSchema.parse(req.body);

    const jobId = `own-bot-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const session = new BotJobSession(jobId, meeting_id);
    activeSessions.set(jobId, session);

    console.log(`[WORKER_API] Created job ${jobId} for meeting ${meeting_id} (${meeting_url})`);

    // Execute asynchronously in background
    session
      .start({ meetingUrl: meeting_url, botName: bot_name })
      .finally(() => {
        activeSessions.delete(jobId);
      });

    return res.status(202).json({
      success: true,
      job_id: jobId,
      status: 'bot_dispatched',
      message: `Bot dispatched for meeting ${meeting_id}`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map((e) => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch bot' });
  }
});

// Stop a Bot
app.delete('/jobs/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const session = activeSessions.get(id);

  if (!session) {
    return res.status(404).json({ success: false, error: `Job ${id} not found or already ended.` });
  }

  session.stop();
  activeSessions.delete(id);

  return res.json({ success: true, message: `Job ${id} stopped.` });
});

app.listen(PORT, () => {
  console.log(`🤖 AutoSync Meet Bot Worker listening on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Webhook target: ${process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/own-bot'}`);
});
