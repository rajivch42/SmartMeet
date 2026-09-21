import { NextResponse, type NextRequest } from 'next/server';
import { evaluateAndSendReminders } from '@/lib/services/reminder-engine';
import { getAllReminders } from '@/lib/services/meeting-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;
    const result = await evaluateAndSendReminders(force);
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message || `Dispatched ${result.remindersSent} reminder(s).`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Reminder evaluation failed';
    return NextResponse.json(
      { success: false, error: { code: 'REMINDER_FAILED', message: msg } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger') === 'true';
    const force = searchParams.get('force') === 'true';

    if (trigger) {
      const result = await evaluateAndSendReminders(force);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const reminders = await getAllReminders();
    return NextResponse.json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch reminders';
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
