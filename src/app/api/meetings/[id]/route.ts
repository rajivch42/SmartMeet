import { NextResponse, type NextRequest } from 'next/server';
import {
  getMeetingById,
  getTranscriptByMeetingId,
  getSummaryByMeetingId,
  getActionItemsByMeetingId,
} from '@/lib/services/meeting-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meeting = await getMeetingById(params.id);
    if (!meeting) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Meeting not found' },
        },
        { status: 404 }
      );
    }

    const transcript = await getTranscriptByMeetingId(meeting.id);
    const summary = await getSummaryByMeetingId(meeting.id);
    const actionItems = await getActionItemsByMeetingId(meeting.id);

    return NextResponse.json({
      success: true,
      data: {
        meeting,
        transcript,
        summary,
        action_items: actionItems,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error fetching meeting detail';
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
