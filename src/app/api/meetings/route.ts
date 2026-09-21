import { NextResponse, type NextRequest } from 'next/server';
import { getMeetingsList, upsertMeetings } from '@/lib/services/meeting-store';
import { z } from 'zod';

const createMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required'),
  meeting_url: z.string().url('Must be a valid URL (e.g. Google Meet)'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  attendees: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().email(),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const meetings = await getMeetingsList();
    return NextResponse.json({
      success: true,
      count: meetings.length,
      data: meetings,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch meetings';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FETCH_MEETINGS_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createMeetingSchema.parse(body);

    const now = new Date();
    const startTime = validated.start_time || now.toISOString();
    const endTime =
      validated.end_time || new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

    const [newMeeting] = await upsertMeetings([
      {
        title: validated.title,
        meeting_url: validated.meeting_url,
        start_time: startTime,
        end_time: endTime,
        attendees: validated.attendees || [],
        status: 'scheduled',
      },
    ]);

    return NextResponse.json({
      success: true,
      data: newMeeting,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors.map((e) => e.message).join(', '),
          },
        },
        { status: 400 }
      );
    }

    const msg = error instanceof Error ? error.message : 'Failed to create meeting';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'CREATE_MEETING_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}
