import { NextResponse, type NextRequest } from 'next/server';
import {
  getMeetingById,
  getSummaryByMeetingId,
  getActionItemsByMeetingId,
} from '@/lib/services/meeting-store';
import { broadcastSummaryToSlack } from '@/lib/services/slack';
import { z } from 'zod';

const slackRequestSchema = z.object({
  meeting_id: z.string().min(1, 'Meeting ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id } = slackRequestSchema.parse(body);

    const meeting = await getMeetingById(meeting_id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } },
        { status: 404 }
      );
    }

    const summary = await getSummaryByMeetingId(meeting.id);
    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NO_SUMMARY', message: 'Please generate an AI summary before broadcasting to Slack.' },
        },
        { status: 400 }
      );
    }

    const actionItems = await getActionItemsByMeetingId(meeting.id);

    const result = await broadcastSummaryToSlack(meeting, summary, actionItems);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') } },
        { status: 400 }
      );
    }

    const msg = error instanceof Error ? error.message : 'Slack broadcast failed';
    return NextResponse.json(
      { success: false, error: { code: 'SLACK_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
