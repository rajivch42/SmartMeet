import { CaptureRequest, CaptureResponse, MeetingCaptureProvider } from './types';
import { dispatchRecallBot } from '../recall-bot';

export const recallProvider: MeetingCaptureProvider = {
  name: 'recall',

  async dispatch(req: CaptureRequest): Promise<CaptureResponse> {
    const res = await dispatchRecallBot({
      meetingUrl: req.meetingUrl,
      meetingId: req.meetingId,
      botName: req.botName || 'AutoSync AI Assistant',
    });

    return {
      botId: res.botId,
      status: res.status,
      isRealBot: res.isRealBot,
    };
  },

  async stop(botId: string): Promise<{ success: boolean; message?: string }> {
    // If demo bot
    if (botId.startsWith('recall-bot-')) {
      return { success: true, message: 'Demo bot stopped.' };
    }

    const apiKey = process.env.RECALL_AI_API_KEY;
    if (!apiKey) {
      return { success: true, message: 'No Recall API key, skipped.' };
    }

    const region = process.env.RECALL_AI_REGION;
    const baseUrl = region && region !== 'us-east-1'
      ? `https://${region}.recall.ai/api/v1`
      : 'https://api.recall.ai/api/v1';

    try {
      const res = await fetch(`${baseUrl}/bot/${botId}/leave_call/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return { success: false, message: `Recall stop status: ${res.status}` };
      }

      return { success: true, message: 'Recall bot left meeting.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to stop Recall bot' };
    }
  },
};
