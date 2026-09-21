import { NextResponse, type NextRequest } from 'next/server';
import { getTranscriptByMeetingId } from '@/lib/services/meeting-store';
import { generateSuggestedQuestions } from '@/lib/services/llm-summarizer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meeting_id');

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_MEETING_ID', message: 'meeting_id is required' } },
        { status: 400 }
      );
    }

    const transcript = await getTranscriptByMeetingId(meetingId);
    if (!transcript || !transcript.raw_text || transcript.raw_text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const suggestions = await generateSuggestedQuestions(transcript.raw_text);

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error: unknown) {
    console.error('[API_QA_SUGGESTIONS_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return NextResponse.json(
      { success: false, error: { code: 'SUGGESTIONS_FAILED', message: msg } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const meetingId = body.meeting_id;

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_MEETING_ID', message: 'meeting_id is required' } },
        { status: 400 }
      );
    }

    const transcript = await getTranscriptByMeetingId(meetingId);
    if (!transcript || !transcript.raw_text || transcript.raw_text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const suggestions = await generateSuggestedQuestions(transcript.raw_text);

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error: unknown) {
    console.error('[API_QA_SUGGESTIONS_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return NextResponse.json(
      { success: false, error: { code: 'SUGGESTIONS_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
