import { NextResponse, type NextRequest } from 'next/server';
import { getMeetingsList, upsertMeetings } from '@/lib/services/meeting-store';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Meeting id and status are required' } },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    let query = admin.from('meetings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { error: patchErr } = await query;
    if (patchErr) {
      throw new Error(`Failed to update meeting status: ${patchErr.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Meeting status updated to ${status}.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update meeting';
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ID', message: 'Meeting id is required' } },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    // Verify meeting exists and belongs to user (or allow admin deletion)
    let query = admin.from('meetings').delete().eq('id', id);
    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { error: delErr } = await query;
    if (delErr) {
      throw new Error(`Failed to delete meeting: ${delErr.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting dismissed successfully.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete meeting';
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
