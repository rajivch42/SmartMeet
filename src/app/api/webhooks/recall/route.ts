import { NextResponse, type NextRequest } from 'next/server';
import { saveTranscript, updateMeetingStatus } from '@/lib/services/meeting-store';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = payload.event; // e.g. 'bot.status_change', 'transcript.done'
    const botData = payload.data?.bot;
    const metadata = botData?.metadata || {};
    const meetingId = metadata.meeting_id;

    console.log(`[RECALL_WEBHOOK] Received event: ${event}`, { meetingId, botId: botData?.id });

    if (!meetingId) {
      return NextResponse.json({ success: true, message: 'Event acknowledged (no meeting_id).' });
    }

    if (event === 'bot.status_change') {
      const code = payload.data?.status?.code;
      if (code === 'in_call_recording' || code === 'in_call_not_recording') {
        await updateMeetingStatus(meetingId, 'in_progress', botData?.id);
      } else if (code === 'fatal' || code === 'call_ended') {
        // Handled upon transcript delivery
      }
    } else if (event === 'transcript.done' || event === 'bot.transcription') {
      // Ingest the completed transcript payload
      const transcriptWords = payload.data?.transcript || [];
      let fullText = '';
      const speakerSet = new Set<string>();

      if (Array.isArray(transcriptWords)) {
        for (const item of transcriptWords) {
          const speaker = item.speaker || 'Speaker';
          speakerSet.add(speaker);
          const words = item.words?.map((w: { text: string }) => w.text).join(' ') || item.text || '';
          fullText += `${speaker}: ${words}\n`;
        }
      } else if (typeof payload.data?.raw_text === 'string') {
        fullText = payload.data.raw_text;
      }

      if (fullText.length > 0) {
        await saveTranscript({
          meeting_id: meetingId,
          raw_text: fullText,
          speakers: Array.from(speakerSet),
          duration_seconds: payload.data?.duration || 0,
        });

        await updateMeetingStatus(meetingId, 'transcribed', botData?.id);
      }
    }

    return NextResponse.json({ success: true, event });
  } catch (error: unknown) {
    console.error('[RECALL_WEBHOOK_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Webhook processing error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
