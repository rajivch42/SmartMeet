import { NextResponse, type NextRequest } from 'next/server';
import {
  getMeetingById,
  updateMeetingStatus,
  saveTranscript,
  saveSummary,
  saveActionItems,
} from '@/lib/services/meeting-store';
import { getRecallBotDetails, fetchRecallBotTranscript } from '@/lib/services/recall-bot';
import { summarizeMeetingTranscript } from '@/lib/services/llm-summarizer';
import { broadcastSummaryToSlack } from '@/lib/services/slack';
import { z } from 'zod';

const syncSchema = z.object({
  meeting_id: z.string().min(1, 'Meeting ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id } = syncSchema.parse(body);

    const meeting = await getMeetingById(meeting_id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } },
        { status: 404 }
      );
    }

    if (!meeting.recall_bot_id) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_BOT', message: 'No Recall.ai bot has been dispatched for this meeting.' } },
        { status: 400 }
      );
    }

    // Query Recall.ai for current bot status
    const botDetails = await getRecallBotDetails(meeting.recall_bot_id);
    const statusCode = (botDetails?.status as Record<string, unknown>)?.code as string | undefined;

    // Check if transcript is ready
    const realTranscript = await fetchRecallBotTranscript(meeting.recall_bot_id);

    if (realTranscript && realTranscript.raw_text.length > 0) {
      await saveTranscript({
        meeting_id: meeting.id,
        raw_text: realTranscript.raw_text,
        speakers: realTranscript.speakers,
        duration_seconds: realTranscript.duration_seconds,
      });

      await updateMeetingStatus(meeting.id, 'transcribed', meeting.recall_bot_id);

      // Run AI Summarization pipeline
      try {
        const summaryResult = await summarizeMeetingTranscript(
          realTranscript.raw_text,
          meeting.attendees || []
        );

        const savedSummary = await saveSummary({
          meeting_id: meeting.id,
          executive_summary: summaryResult.executive_summary,
          decisions: summaryResult.decisions,
          discussion_points: summaryResult.discussion_points,
          model_version: summaryResult.model_version,
        });

        const savedActionItems = await saveActionItems(
          meeting.id,
          summaryResult.action_items.map((item: any) => ({
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

        const summarizedMeeting = await updateMeetingStatus(meeting.id, 'summarized', meeting.recall_bot_id);

        try {
          await broadcastSummaryToSlack(meeting, savedSummary, savedActionItems);
        } catch (slackErr) {
          console.warn('[SYNC_ROUTE] Slack broadcast warning:', slackErr);
        }

        return NextResponse.json({
          success: true,
          data: {
            status: 'summarized',
            meeting: summarizedMeeting,
            summary: savedSummary,
            action_items: savedActionItems,
            message: 'Real meeting transcript and AI summary loaded successfully from Recall.ai!',
          },
        });
      } catch (sumErr: any) {
        console.error('[SYNC_ROUTE] Error summarizing transcript:', sumErr);
        return NextResponse.json({
          success: true,
          data: {
            status: 'transcribed',
            meeting,
            transcript: realTranscript,
            message: 'Real meeting transcript downloaded, summary pending.',
          },
        });
      }
    }

    if (statusCode === 'in_call_recording' || statusCode === 'in_call_not_recording') {
      await updateMeetingStatus(meeting.id, 'in_progress', meeting.recall_bot_id);
      return NextResponse.json({
        success: true,
        data: {
          status: 'in_progress',
          bot_status: statusCode,
          message: 'Bot is currently inside the Google Meet recording audio.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: meeting.status,
        bot_status: statusCode || 'processing',
        message: 'Bot is processing or call has not concluded yet. Try again in a few moments.',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error syncing bot status';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
