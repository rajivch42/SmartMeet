import { NextResponse, type NextRequest } from 'next/server';
import {
  getMeetingById,
  getTranscriptByMeetingId,
  saveSummary,
  saveActionItems,
  updateMeetingStatus,
} from '@/lib/services/meeting-store';
import { summarizeMeetingTranscript } from '@/lib/services/llm-summarizer';
import { z } from 'zod';

const summarizeRequestSchema = z.object({
  meeting_id: z.string().min(1, 'Meeting ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id } = summarizeRequestSchema.parse(body);

    const meeting = await getMeetingById(meeting_id);
    if (!meeting) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEETING_NOT_FOUND', message: `Meeting ${meeting_id} not found.` },
        },
        { status: 404 }
      );
    }

    const transcript = await getTranscriptByMeetingId(meeting.id);
    if (!transcript || !transcript.raw_text) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript found for this meeting. Please record or ingest audio first.',
          },
        },
        { status: 400 }
      );
    }

    // Process through LLM Summarizer pipeline
    const result = await summarizeMeetingTranscript(transcript.raw_text, meeting.attendees);

    // Save summary
    const savedSummary = await saveSummary({
      meeting_id: meeting.id,
      executive_summary: result.executive_summary,
      decisions: result.decisions,
      discussion_points: result.discussion_points,
      model_version: result.model_version,
    });

    // Save action items
    const savedActionItems = await saveActionItems(
      meeting.id,
      result.action_items.map((item) => ({
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

    // Update meeting status to 'summarized'
    await updateMeetingStatus(meeting.id, 'summarized');

    return NextResponse.json({
      success: true,
      data: {
        summary: savedSummary,
        action_items: savedActionItems,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') },
        },
        { status: 400 }
      );
    }

    console.error('[API_SUMMARIZE_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Summarization error';
    return NextResponse.json(
      { success: false, error: { code: 'SUMMARIZE_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
