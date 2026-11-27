import { NextResponse, type NextRequest } from 'next/server';
import {
  getMeetingById,
  saveTranscript,
  saveSummary,
  saveActionItems,
  updateMeetingStatus,
} from '@/lib/services/meeting-store';
import { summarizeMeetingTranscript } from '@/lib/services/llm-summarizer';
import { broadcastSummaryToSlack } from '@/lib/services/slack';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const configuredSecret = process.env.WEBHOOK_SECRET || 'autosync-webhook-secret';

    // Optional bearer validation if configured
    if (configuredSecret && configuredSecret !== 'change-me-too') {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token && token !== configuredSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized webhook request' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const {
      meeting_id,
      bot_id,
      status,
      raw_text,
      speakers,
      duration_seconds,
      error,
    } = payload;

    if (!meeting_id) {
      return NextResponse.json({ success: false, error: 'meeting_id is required' }, { status: 400 });
    }

    console.log(`[OWN_BOT_WEBHOOK] Received webhook for meeting ${meeting_id}:`, {
      bot_id,
      status,
      textLength: raw_text?.length || 0,
      speakersCount: speakers?.length || 0,
    });

    const meeting = await getMeetingById(meeting_id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: `Meeting ${meeting_id} not found` }, { status: 404 });
    }

    // 1. Status: In Progress (Admitted to Google Meet)
    if (status === 'in_progress') {
      await updateMeetingStatus(meeting.id, 'in_progress', bot_id);
      return NextResponse.json({ success: true, status: 'in_progress', message: 'Status updated to in_progress' });
    }

    // 2. Status: Failed (Denied or Timed Out)
    if (status === 'failed') {
      await updateMeetingStatus(meeting.id, 'failed', bot_id);
      return NextResponse.json({ success: true, status: 'failed', error: error || 'Bot failed to join meeting' });
    }

    // 3. Status: Transcribed / Finished Call
    if (raw_text && raw_text.trim().length > 0) {
      // Save transcript
      const savedTranscript = await saveTranscript({
        meeting_id: meeting.id,
        raw_text: raw_text.trim(),
        speakers: Array.isArray(speakers) && speakers.length > 0 ? speakers : ['Participants'],
        duration_seconds: duration_seconds || 60,
      });

      await updateMeetingStatus(meeting.id, 'transcribed', bot_id);

      // Run AI Summarization pipeline
      try {
        const summaryResult = await summarizeMeetingTranscript(raw_text, meeting.attendees || []);

        const savedSummary = await saveSummary({
          meeting_id: meeting.id,
          executive_summary: summaryResult.executive_summary,
          decisions: summaryResult.decisions,
          discussion_points: summaryResult.discussion_points,
          model_version: summaryResult.model_version,
        });

        const savedActionItems = await saveActionItems(
          meeting.id,
          summaryResult.action_items.map((item) => ({
            meeting_id: meeting.id,
            title: item.title,
            description: item.description || null,
            assignee_name: item.assignee_name,
            assignee_email: item.assignee_email || null,
            due_date: item.due_date || null,
            priority: item.priority,
            status: 'pending',
          }))
        );

        await updateMeetingStatus(meeting.id, 'summarized', bot_id);

        // Broadcast to Slack if webhook configured
        try {
          await broadcastSummaryToSlack(meeting, savedSummary, savedActionItems);
        } catch (slackErr) {
          console.warn('[OWN_BOT_WEBHOOK] Slack broadcast warning:', slackErr);
        }

        return NextResponse.json({
          success: true,
          meeting_id: meeting.id,
          status: 'summarized',
          transcript_id: savedTranscript.id,
          decisions_count: savedSummary.decisions.length,
          tasks_count: savedActionItems.length,
        });
      } catch (aiErr: any) {
        console.error('[OWN_BOT_WEBHOOK] AI Summarization error:', aiErr);
        // Meeting remains in 'transcribed' state so user still has full transcript
        return NextResponse.json({
          success: true,
          meeting_id: meeting.id,
          status: 'transcribed',
          warning: `Transcript saved, but AI summarization failed: ${aiErr.message}`,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook event processed' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    console.error('[OWN_BOT_WEBHOOK_ERROR]', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
