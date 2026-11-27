'use client';

import React, { useState } from 'react';
import { Link2, RefreshCw } from 'lucide-react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { useUndoDeleteMeeting } from '@/lib/hooks/useUndoDeleteMeeting';
import HeroMeetingCard from '@/components/dashboard/HeroMeetingCard';
import MetricsStack from '@/components/dashboard/MetricsStack';
import RecentMeetingsTable from '@/components/dashboard/RecentMeetingsTable';
import AdHocMeetingModal from '@/components/meetings/AdHocMeetingModal';
import { Meeting } from '@/types/database';

export default function DashboardPage() {
  const {
    meetings,
    taskCount,
    syncedCount,
    timeSaved,
    upcomingCount,
    completedCount,
    refreshWithCalendarSync,
    refreshing,
    lastUpdatedText,
    dispatchBot,
    dispatchingBotId,
    addMeeting,
    syncBotTranscript,
  } = useDashboard();

  const { undoToast, handleDeleteMeeting, handleUndo } = useUndoDeleteMeeting();

  const [modalOpen, setModalOpen] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Completion predicate
  const isMeetingCompleted = (m: Meeting) =>
    m.status === 'summarized' ||
    m.status === 'transcribed' ||
    (m.decision_count != null && m.decision_count > 0);

  // Segregate upcoming vs completed (Completed sorted newest first)
  const upcomingMeetings = meetings.filter((m) => !isMeetingCompleted(m));
  const completedMeetings = [...meetings]
    .filter((m) => isMeetingCompleted(m))
    .sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || a.start_time || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || b.start_time || 0).getTime();
      return timeB - timeA;
    });

  // The primary hero meeting (first upcoming meeting or null)
  const heroMeeting = upcomingMeetings[0] || null;

  const handleRefresh = async () => {
    try {
      setRefreshError(null);
      await refreshWithCalendarSync();
    } catch (err: any) {
      setRefreshError(err.message || 'Failed to sync calendar');
    }
  };

  const handleDispatch = async (meetingId: string) => {
    await dispatchBot(meetingId);
  };

  return (
    <div className="dash-dashboard-view">
      {/* Top Header Bar */}
      <div className="dash-top-bar">
        <div>
          <h1 className="dash-page-title">Dashboard</h1>
          <p className="dash-page-subtitle">
            {upcomingCount === 0
              ? 'No calls currently waiting for the bot. '
              : `${upcomingCount} call${upcomingCount > 1 ? 's are' : ' is'} waiting for the bot. `}
            {completedCount === 0
              ? 'No meetings summarized yet.'
              : `${completedCount} meeting${completedCount > 1 ? 's' : ''} summarized so far.`}
          </p>
          {lastUpdatedText && (
            <span style={{ fontSize: '12px', color: '#7F8AA0', display: 'block', marginTop: '4px' }}>
              {lastUpdatedText}
            </span>
          )}
          {refreshError && (
            <div style={{ fontSize: '12px', color: '#F87171', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{refreshError}</span>
              <button
                type="button"
                onClick={handleRefresh}
                style={{ background: 'none', border: 'none', color: '#8FA6F5', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Top Right Action Buttons: Paste Meet Link + Sync Calendar */}
        <div className="dash-top-actions">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="dash-top-btn"
          >
            <Link2 size={15} />
            <span>Paste Meet Link</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="dash-top-btn"
          >
            <RefreshCw size={15} className={refreshing ? 'dash-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Calendar'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Hero Meeting Card (65%) + Metrics Stack (35%) */}
      <div className="dash-main-grid-row">
        <HeroMeetingCard
          meeting={heroMeeting}
          onDispatch={handleDispatch}
          dispatchingId={dispatchingBotId}
          onDelete={handleDeleteMeeting}
          onSyncBot={syncBotTranscript}
        />

        <MetricsStack
          timeSaved={timeSaved}
          totalTasks={taskCount}
          syncedTasks={syncedCount}
        />
      </div>

      {/* 5-Second Live Countdown Undo Toast */}
      {undoToast && (
        <div className="undo-toast-banner" role="alert">
          <span className="undo-toast-text">
            Deleted &ldquo;{undoToast.meeting.title}&rdquo;.
          </span>
          <button type="button" onClick={handleUndo} className="undo-toast-btn">
            Undo ({undoToast.countdown}s)
          </button>
        </div>
      )}

      {/* Full Width Lower Table: Recent Meetings */}
      <RecentMeetingsTable meetings={completedMeetings} />

      {/* Ad-Hoc Meeting Modal */}
      <AdHocMeetingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onMeetingCreated={(newM) => addMeeting(newM)}
      />
    </div>
  );
}
