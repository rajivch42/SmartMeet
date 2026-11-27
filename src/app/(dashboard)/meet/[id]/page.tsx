'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InAppMeetingRoom from '@/components/meet/InAppMeetingRoom';
import { Meeting } from '@/types/database';
import { ArrowLeft, Video, AlertTriangle } from 'lucide-react';

export default function InAppMeetPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createFallbackMeeting = (id: string): Meeting => ({
    id,
    user_id: 'default-user',
    title: `In-App Meeting Room (${id.slice(0, 8)})`,
    meeting_url: `https://meet.jit.si/autosync-${id.slice(0, 16)}`,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    external_calendar_id: null,
    recall_bot_id: null,
    error_message: null,
    status: 'in_progress',
    attendees: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    async function loadMeeting() {
      try {
        setLoading(true);
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (!res.ok) {
          setMeeting(createFallbackMeeting(meetingId));
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.data?.meeting) {
          setMeeting(data.data.meeting);
        } else {
          setMeeting(createFallbackMeeting(meetingId));
        }
      } catch (err: any) {
        console.warn('[IN_APP_MEET] Error loading meeting:', err);
        setMeeting(createFallbackMeeting(meetingId));
      } finally {
        setLoading(false);
      }
    }

    if (meetingId) {
      loadMeeting();
    }
  }, [meetingId]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center text-slate-300 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Entering Meeting Room...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-100">Meeting Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Unable to locate meeting with ID: {meetingId}.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return <InAppMeetingRoom meeting={meeting} />;
}
