import { NextResponse, type NextRequest } from 'next/server';
import { getCaptureProvider } from '@/lib/services/capture';
import { generateDemoTranscript } from '@/lib/services/recall-bot';
import { getMeetingById, updateMeetingStatus, saveTranscript } from '@/lib/services/meeting-store';
import { z } from 'zod';

const dispatchSchema = z.object({
  meeting_id: z.string().min(1, 'Meeting ID is required'),
  simulate_complete: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id, simulate_complete = true } = dispatchSchema.parse(body);

    const meeting = await getMeetingById(meeting_id);
    if (!meeting) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEETING_NOT_FOUND', message: `Meeting with ID ${meeting_id} not found.` },
        },
        { status: 404 }
      );
    }

    // Dispatch Meeting Bot (Recall.ai or Custom Own Bot Worker via Provider)
    const provider = getCaptureProvider();
    const botName = provider.name === 'own' ? 'My Own Bot' : 'AutoSync AI Assistant';
    console.log(`[BOT_DISPATCH] Dispatching via provider: "${provider.name}" with bot name: "${botName}"`);

    const botResult = await provider.dispatch({
      meetingUrl: meeting.meeting_url,
      meetingId: meeting.id,
      botName,
    });

    // Update status to bot_dispatched
    await updateMeetingStatus(meeting.id, 'bot_dispatched', botResult.botId);

    // Only simulate if real bot was NOT dispatched (i.e. in offline demo mode)
    if (!botResult.isRealBot && simulate_complete) {
      const demoTranscript = generateDemoTranscript(meeting.id);
      await saveTranscript(demoTranscript);
      const updatedMeeting = await updateMeetingStatus(meeting.id, 'transcribed', botResult.botId);

      return NextResponse.json({
        success: true,
        data: {
          provider: provider.name,
          bot_id: botResult.botId,
          status: 'transcribed',
          meeting: updatedMeeting,
          message: 'Simulated demo transcript loaded.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        provider: provider.name,
        bot_id: botResult.botId,
        status: 'bot_dispatched',
        message: `Bot ("${botName}") successfully dispatched to Google Meet via ${provider.name === 'own' ? 'My Own Bot Worker' : 'Recall.ai'}! Please click "Admit" in your meeting window when the bot knocks.`,
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

    const msg = error instanceof Error ? error.message : 'Bot dispatch failed';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BOT_DISPATCH_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}
