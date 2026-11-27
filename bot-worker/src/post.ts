export interface WebhookPayload {
  meeting_id: string;
  bot_id: string;
  status?: 'in_progress' | 'transcribed' | 'failed';
  raw_text?: string;
  speakers?: string[];
  duration_seconds?: number;
  error?: string;
}

/**
 * Dispatches an event or transcript payload to the AutoSync Meet webhook.
 */
export async function sendWebhookUpdate(payload: WebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/own-bot';
  const secret = process.env.WEBHOOK_SECRET || 'autosync-webhook-secret';

  console.log(`[POST_WEBHOOK] Sending webhook event to ${webhookUrl}:`, {
    meeting_id: payload.meeting_id,
    bot_id: payload.bot_id,
    status: payload.status,
    hasTranscript: !!payload.raw_text,
  });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[POST_WEBHOOK] Webhook responded with status ${res.status}:`, errText);
      return false;
    }

    const data = await res.json();
    console.log(`[POST_WEBHOOK] Successfully delivered to AutoSync Meet:`, data);
    return true;
  } catch (err) {
    console.error(`[POST_WEBHOOK] Failed to reach AutoSync Meet webhook at ${webhookUrl}:`, err);
    return false;
  }
}
