import { CaptureRequest, CaptureResponse, MeetingCaptureProvider } from './types';

export const ownProvider: MeetingCaptureProvider = {
  name: 'own',

  async dispatch(req: CaptureRequest): Promise<CaptureResponse> {
    const workerUrl = (process.env.BOT_WORKER_URL || 'http://localhost:3001').replace(/\/$/, '');
    const secret = process.env.WORKER_SECRET || 'autosync-bot-secret';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    };

    try {
      const res = await fetch(`${workerUrl}/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          meeting_id: req.meetingId,
          meeting_url: req.meetingUrl,
          bot_name: req.botName || 'My Own Bot',
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Bot worker error (${res.status}): ${errText}`);
      }

      const json = await res.json();
      return {
        botId: json.job_id || json.botId || `own-bot-${Date.now()}`,
        status: 'bot_dispatched',
        isRealBot: true,
      };
    } catch (err: any) {
      console.error('[OWN_PROVIDER] Failed to dispatch job to bot worker:', err);
      throw new Error(
        `Failed to reach custom bot worker at ${workerUrl}. Please ensure the bot worker service is running (cd bot-worker && npm run dev). Details: ${err.message}`
      );
    }
  },

  async stop(botId: string): Promise<{ success: boolean; message?: string }> {
    const workerUrl = (process.env.BOT_WORKER_URL || 'http://localhost:3001').replace(/\/$/, '');
    const secret = process.env.WORKER_SECRET || 'autosync-bot-secret';

    try {
      const res = await fetch(`${workerUrl}/jobs/${botId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return { success: false, message: `Worker stop failed with status ${res.status}` };
      }

      return { success: true, message: 'Bot stop signal delivered to worker.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error stopping bot worker' };
    }
  },
};
