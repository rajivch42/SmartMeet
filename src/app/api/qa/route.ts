import { NextResponse, type NextRequest } from 'next/server';
import { getTranscriptByMeetingId, getMeetingsList } from '@/lib/services/meeting-store';
import { answerQuestionOverTranscript } from '@/lib/services/embeddings';
import { z } from 'zod';

const qaRequestSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters long'),
  meeting_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, meeting_id } = qaRequestSchema.parse(body);

    let targetMeetingId = meeting_id;
    let transcriptText = '';

    if (targetMeetingId) {
      const transcript = await getTranscriptByMeetingId(targetMeetingId);
      if (transcript && transcript.raw_text) {
        transcriptText = transcript.raw_text;
      }
    } else {
      // Find the first meeting with an active transcript
      const meetings = await getMeetingsList();
      for (const m of meetings) {
        const tr = await getTranscriptByMeetingId(m.id);
        if (tr && tr.raw_text) {
          targetMeetingId = m.id;
          transcriptText = tr.raw_text;
          break;
        }
      }
    }

    if (!transcriptText || !targetMeetingId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No recorded meeting transcripts found to answer questions from.',
          },
        },
        { status: 400 }
      );
    }

    const result = await answerQuestionOverTranscript(targetMeetingId, transcriptText, query);

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

    console.error('[API_QA_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Q&A processing failed';
    return NextResponse.json(
      { success: false, error: { code: 'QA_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
