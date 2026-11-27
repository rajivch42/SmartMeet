// Google Calendar Service (API v3)
import { MeetingAttendee } from '@/types/database';

export interface CalendarEventDTO {
  externalCalendarId: string;
  title: string;
  meetingUrl: string;
  startTime: string;
  endTime: string;
  attendees: MeetingAttendee[];
}

/**
 * Automatically refreshes an expired Google OAuth access token using the stored refresh_token.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token || null;
    }
    const errText = await res.text();
    console.warn('[GOOGLE_CALENDAR] Token refresh failed:', errText);
    return null;
  } catch (err) {
    console.error('[GOOGLE_CALENDAR] Exception refreshing access token:', err);
    return null;
  }
}

/**
 * Fetches upcoming events from the user's primary Google Calendar.
 * If allowFallbackDemo is false (default for logged in users), returns real events
 * or an empty array (never dummy demo events).
 */
export async function fetchUpcomingGoogleEvents(
  accessToken?: string | null,
  allowFallbackDemo: boolean = false
): Promise<CalendarEventDTO[]> {
  if (!accessToken || accessToken === 'placeholder-google-token') {
    return allowFallbackDemo ? getFallbackDemoEvents() : [];
  }

  try {
    // Only fetch upcoming meetings within the next 7 days (transient sync window)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[GOOGLE_CALENDAR] API returned status ${response.status}: ${errorText}.`);
      return allowFallbackDemo ? getFallbackDemoEvents() : [];
    }

    const data = await response.json();
    const items = data.items || [];

    const mappedEvents: CalendarEventDTO[] = [];

    for (const item of items) {
      // Ignore cancelled events
      if (item.status === 'cancelled') continue;

      // Extract real video meeting link from hangoutLink, conferenceData, location, or description
      let meetUrl: string | null = item.hangoutLink || null;
      if (!meetUrl && item.conferenceData?.entryPoints) {
        const videoEntry = item.conferenceData.entryPoints.find(
          (ep: { entryPointType: string; uri: string }) =>
            ep.entryPointType === 'video' || (ep.uri && ep.uri.includes('meet.google.com'))
        );
        if (videoEntry?.uri) {
          meetUrl = videoEntry.uri;
        }
      }

      // Check if location or description explicitly has a meet.google.com link
      if (!meetUrl) {
        const textToCheck = `${item.location || ''} ${item.description || ''}`;
        const match = textToCheck.match(/https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
        if (match) {
          meetUrl = match[0];
        }
      }

      // STRICT FILTER: Discard any calendar entry that does NOT have a valid Google Meet link,
      // or looks like travel/transit reservations (e.g. Train, Flight, Doctor, Hotel, Reminder)
      if (!meetUrl || !meetUrl.includes('meet.google.com/')) {
        continue;
      }

      const summaryLower = (item.summary || '').toLowerCase();
      if (
        summaryLower.startsWith('train to') ||
        summaryLower.startsWith('flight to') ||
        summaryLower.includes('reservation') ||
        summaryLower.includes('booking')
      ) {
        continue;
      }

      const attendees: MeetingAttendee[] = (item.attendees || []).map(
        (att: { displayName?: string; email: string }) => ({
          name: att.displayName || att.email.split('@')[0],
          email: att.email,
        })
      );

      const startTime = item.start?.dateTime || item.start?.date || new Date().toISOString();
      const endTime = item.end?.dateTime || item.end?.date || new Date(Date.now() + 30 * 60000).toISOString();

      mappedEvents.push({
        externalCalendarId: item.id,
        title: item.summary || 'Untitled Team Sync',
        meetingUrl: meetUrl,
        startTime,
        endTime,
        attendees,
      });
    }

    return mappedEvents;
  } catch (error) {
    console.error('[GOOGLE_CALENDAR] Exception during calendar fetch:', error);
    return allowFallbackDemo ? getFallbackDemoEvents() : [];
  }
}

/**
 * Realistic seed events for reliable offline and demo presentation scenarios.
 */
export function getFallbackDemoEvents(): CalendarEventDTO[] {
  const now = new Date();
  
  // Meeting 1: 30 minutes from now (Today's immediate sync)
  const m1Start = new Date(now.getTime() + 30 * 60 * 1000);
  const m1End = new Date(m1Start.getTime() + 45 * 60 * 1000);

  // Meeting 2: 3 hours from now
  const m2Start = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const m2End = new Date(m2Start.getTime() + 30 * 60 * 1000);

  // Meeting 3: Tomorrow morning
  const m3Start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  m3Start.setHours(10, 0, 0, 0);
  const m3End = new Date(m3Start.getTime() + 60 * 60 * 1000);

  return [
    {
      externalCalendarId: 'demo-meet-001',
      title: 'Sprint 24 Architecture & Schema Sync',
      meetingUrl: 'https://meet.google.com/vfd-qkxz-qwe',
      startTime: m1Start.toISOString(),
      endTime: m1End.toISOString(),
      attendees: [
        { name: 'Alex Morgan', email: 'alex.morgan@company.internal' },
        { name: 'Jordan Rivera', email: 'jordan.rivera@company.internal' },
        { name: 'Sarah Chen', email: 'sarah.chen@company.internal' },
      ],
    },
    {
      externalCalendarId: 'demo-meet-002',
      title: 'Q3 Infrastructure & Jira Alignment',
      meetingUrl: 'https://meet.google.com/mno-pwqd-zxc',
      startTime: m2Start.toISOString(),
      endTime: m2End.toISOString(),
      attendees: [
        { name: 'Engineering Lead', email: 'lead@company.internal' },
        { name: 'Alex Morgan', email: 'alex.morgan@company.internal' },
      ],
    },
    {
      externalCalendarId: 'demo-meet-003',
      title: 'API Security & OAuth Review',
      meetingUrl: 'https://meet.google.com/ert-tyui-opq',
      startTime: m3Start.toISOString(),
      endTime: m3End.toISOString(),
      attendees: [
        { name: 'Security Auditor', email: 'security@company.internal' },
        { name: 'Jordan Rivera', email: 'jordan.rivera@company.internal' },
      ],
    },
  ];
}
