import { NextResponse } from 'next/server';
import { resetAndSeedDemoState, clearInMemoryDemoMeetings } from '@/lib/services/meeting-store';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isMock = !url || url.includes('placeholder-project') || url.includes('your-project');

  if (!isMock) {
    clearInMemoryDemoMeetings();
    return NextResponse.json({
      success: true,
      message: 'Demo cache cleared. Operating in live mode with your connected Google Calendar.',
      data: { meetingsCount: 0, tasksCount: 0 },
    });
  }

  const result = resetAndSeedDemoState();
  return NextResponse.json({
    success: true,
    message: 'Demo dataset reset and re-seeded successfully.',
    data: result,
  });
}
