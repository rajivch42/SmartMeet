import { NextResponse, type NextRequest } from 'next/server';
import { getMeetingsList, updateMeetingStatus, saveTranscript } from '@/lib/services/meeting-store';
import { getCaptureProvider } from '@/lib/services/capture';
import { generateDemoTranscript } from '@/lib/services/recall-bot';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleAutoJoin(request);
}

export async function POST(request: NextRequest) {
  return handleAutoJoin(request);
}

async function handleAutoJoin(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceMeetingId = searchParams.get('meeting_id');
    const forceAll = searchParams.get('force') === 'true';

    const now = Date.now();
    // Auto-join window: starts between 10 minutes ago and 5 minutes from now
    const pastWindow = now - 10 * 60 * 1000;
    const futureWindow = now + 5 * 60 * 1000;

    const allMeetings = await getMeetingsList();

    // Filter eligible meetings
    const eligibleMeetings = allMeetings.filter((m) => {
      // Must not be already in progress, completed, or explicitly skipped by the user
      if (
        m.status === 'in_progress' ||
        m.status === 'bot_dispatched' ||
        m.status === 'summarized' ||
        m.status === 'transcribed' ||
        m.status === 'skipped'
      ) {
        return false;
      }

      // Must have a valid Google Meet link
      if (!m.meeting_url || !m.meeting_url.includes('meet.google.com')) {
        return false;
      }

      // If a specific meeting ID was requested for manual testing
      if (forceMeetingId && m.id === forceMeetingId) {
        return true;
      }

      // If forceAll is passed for test verification
      if (forceAll) {
        return true;
      }

      // Check start_time window
      if (!m.start_time) return false;
      const startTimeMs = new Date(m.start_time).getTime();
      return startTimeMs >= pastWindow && startTimeMs <= futureWindow;
    });

    const dispatchedResults = [];

    for (const meeting of eligibleMeetings) {
      try {
        console.log(`[AUTO_JOIN_CRON] Auto-dispatching bot for meeting: "${meeting.title}" (${meeting.id})`);

        const provider = getCaptureProvider();
        const botName = provider.name === 'own' ? 'My Own Bot' : 'AutoSync AI Assistant';
        console.log(`[AUTO_JOIN_CRON] Provider: "${provider.name}", Bot Name: "${botName}"`);

        const botResult = await provider.dispatch({
          meetingUrl: meeting.meeting_url,
          meetingId: meeting.id,
          botName,
        });

        await updateMeetingStatus(meeting.id, 'bot_dispatched', botResult.botId);

        // If offline demo mode, simulate transcript completion
        if (!botResult.isRealBot) {
          const demoTranscript = generateDemoTranscript(meeting.id);
          await saveTranscript(demoTranscript);
          await updateMeetingStatus(meeting.id, 'transcribed', botResult.botId);
        }

        dispatchedResults.push({
          id: meeting.id,
          title: meeting.title,
          meeting_url: meeting.meeting_url,
          start_time: meeting.start_time,
          bot_id: botResult.botId,
          simulated: !botResult.isRealBot,
          status: botResult.isRealBot ? 'bot_dispatched' : 'transcribed',
        });
      } catch (dispatchErr: any) {
        console.error(`[AUTO_JOIN_CRON] Failed to dispatch bot for meeting ${meeting.id}:`, dispatchErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      evaluatedMeetingsCount: allMeetings.length,
      eligibleFoundCount: eligibleMeetings.length,
      dispatchedCount: dispatchedResults.length,
      window: {
        from: new Date(pastWindow).toISOString(),
        to: new Date(futureWindow).toISOString(),
      },
      dispatched: dispatchedResults,
      message:
        dispatchedResults.length > 0
          ? `Auto-dispatched ${dispatchedResults.length} bot(s) to upcoming Google Meet call(s).`
          : 'No scheduled meetings currently within the 5-minute auto-join start window.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Auto-join cron failed';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'AUTO_JOIN_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}
