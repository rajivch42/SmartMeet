import { NextResponse, type NextRequest } from 'next/server';
import { fetchUpcomingGoogleEvents, refreshGoogleAccessToken } from '@/lib/services/google-calendar';
import { upsertMeetings, clearInMemoryDemoMeetings } from '@/lib/services/meeting-store';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    // Fallback: If session cookie is absent (e.g. background worker or client fetch), resolve user via integrations
    if (!user) {
      const { data: defaultIntegration } = await admin
        .from('integrations')
        .select('user_id')
        .eq('provider', 'google_calendar')
        .maybeSingle();

      if (defaultIntegration?.user_id) {
        user = { id: defaultIntegration.user_id } as any;
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required to sync Google Calendar.',
          },
        },
        { status: 401 }
      );
    }

    // Lookup user's Google Calendar integration
    const { data: integration, error: intError } = await admin
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .maybeSingle();

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_INTEGRATION',
            message: 'No Google Calendar account is connected. Please connect Google Calendar in Settings.',
          },
        },
        { status: 400 }
      );
    }

    let activeAccessToken = integration.access_token;

    // Proactively refresh the Google OAuth access token using the stored refresh_token
    if (integration.refresh_token) {
      const freshToken = await refreshGoogleAccessToken(integration.refresh_token);
      if (freshToken) {
        activeAccessToken = freshToken;
        await admin
          .from('integrations')
          .update({
            access_token: freshToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);
        console.log(`[CALENDAR_SYNC] Refreshed Google access token for user: ${user.id}`);
      } else {
        console.warn('[CALENDAR_SYNC] Token refresh returned null, attempting existing token.');
      }
    }

    // Fetch real events from Google Calendar (strictly NO fallback demo data)
    const events = await fetchUpcomingGoogleEvents(activeAccessToken, false);

    // Clean up any historical dummy demo meetings or non-video travel reservations for this user
    clearInMemoryDemoMeetings();
    await admin
      .from('meetings')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .or('external_calendar_id.like.demo-meet%,meeting_url.like.%/abc-%,title.ilike.%Train to%');

    // Upsert real events if discovered
    if (events.length > 0) {
      const meetingPayloads = events.map((ev) => ({
        user_id: user.id,
        external_calendar_id: ev.externalCalendarId,
        title: ev.title,
        meeting_url: ev.meetingUrl,
        start_time: ev.startTime,
        end_time: ev.endTime,
        attendees: ev.attendees,
        status: 'scheduled' as const,
      }));

      await upsertMeetings(meetingPayloads);
    }

    // Cancellation / deletion cleanup:
    // Only delete meetings that are strictly 'scheduled' and NOT completed/summarized/transcribed
    const currentCalendarIds = new Set(events.map((e) => e.externalCalendarId));
    const { data: existingScheduled } = await admin
      .from('meetings')
      .select('id, external_calendar_id, status, decision_count')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .is('decision_count', null)
      .not('external_calendar_id', 'is', null);

    if (existingScheduled && existingScheduled.length > 0) {
      const idsToRemove = existingScheduled
        .filter(
          (m) =>
            m.external_calendar_id &&
            !currentCalendarIds.has(m.external_calendar_id) &&
            m.status === 'scheduled' &&
            (!m.decision_count || m.decision_count === 0)
        )
        .map((m) => m.id);

      if (idsToRemove.length > 0) {
        await admin.from('meetings').delete().in('id', idsToRemove);
      }
    }

    // Query all meetings currently in the database for this user
    const { data: allMeetings, error: fetchErr } = await admin
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .or('external_calendar_id.is.null,external_calendar_id.not.like.demo-meet%')
      .order('start_time', { ascending: true });

    if (fetchErr) {
      throw new Error(`Failed to load meetings: ${fetchErr.message}`);
    }

    const formattedMeetings = (allMeetings || []).map((m) => ({
      ...m,
      attendees: typeof m.attendees === 'string' ? JSON.parse(m.attendees) : m.attendees,
    }));

    return NextResponse.json({
      success: true,
      count: formattedMeetings.length,
      syncedCount: events.length,
      data: formattedMeetings,
      message: `Successfully synchronized ${events.length} meetings from your Google Calendar.`,
    });
  } catch (error: unknown) {
    console.error('[API_CALENDAR_SYNC_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Unknown synchronization error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CALENDAR_SYNC_FAILED',
          message: msg,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
