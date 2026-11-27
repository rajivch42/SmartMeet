'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Link2,
  RefreshCw,
  Send,
  ExternalLink,
  Clock,
  ChevronRight,
  Video,
  X,
  Square,
} from 'lucide-react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { useUndoDeleteMeeting } from '@/lib/hooks/useUndoDeleteMeeting';
import AdHocMeetingModal from '@/components/meetings/AdHocMeetingModal';
import { Meeting } from '@/types/database';

export default function MeetingsPage() {
  const {
    meetings,
    refreshWithCalendarSync,
    refreshing,
    lastUpdatedText,
    dispatchBot,
    dispatchingBotId,
    addMeeting,
    syncBotTranscript,
  } = useDashboard();

  const { undoToast, handleDeleteMeeting, handleUndo } = useUndoDeleteMeeting();

  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Unified completion predicate
  const isMeetingCompleted = (m: Meeting) =>
    m.status === 'summarized' ||
    m.status === 'transcribed' ||
    (m.decision_count != null && m.decision_count > 0);

  // Check if an ad-hoc meeting's time passed more than 24 hours ago without bot being sent
  const isMeetingExpired = (m: Meeting) => {
    if (isMeetingCompleted(m) || m.status === 'in_progress') return false;
    if (!m.start_time) return false;
    const meetingTime = new Date(m.start_time).getTime();
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return meetingTime < twentyFourHoursAgo;
  };

  const upcomingMeetings = meetings.filter((m) => !isMeetingCompleted(m));
  const completedMeetings = [...meetings]
    .filter((m) => isMeetingCompleted(m))
    .sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || a.start_time || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || b.start_time || 0).getTime();
      return timeB - timeA;
    });

  // The primary hero upcoming meeting
  const upcomingMeeting = upcomingMeetings[0] || null;

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

  const isDispatching = dispatchingBotId === upcomingMeeting?.id;
  const isInCall = upcomingMeeting?.status === 'in_progress' || upcomingMeeting?.status === 'bot_dispatched';

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins} min ${secs} sec`;
    if (mins > 0) return `${mins} min`;
    return `${secs} sec`;
  };

  return (
    <div className="meetings-view-container">
      {/* 1. Top Bar */}
      <div className="dash-top-bar">
        <div>
          <h1 className="dash-page-title">Meetings</h1>
          <p className="dash-page-subtitle">
            Send the bot to your upcoming Google Meet calls and review what it captured.
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

        {/* Top Right Utility Buttons */}
        <div className="dash-top-actions">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="dash-top-btn"
          >
            <Link2 size={15} />
            <span>Paste meet link</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="dash-top-btn"
          >
            <RefreshCw size={15} className={refreshing ? 'dash-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync calendar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Tab Bar */}
      <div className="meetings-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`meetings-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          <span>All</span>
          <span className="meetings-tab-count">{meetings.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`meetings-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          <span>Upcoming</span>
          <span className="meetings-tab-count">{upcomingMeetings.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`meetings-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
        >
          <span>Completed</span>
          <span className="meetings-tab-count">{completedMeetings.length}</span>
        </button>
      </div>

      {/* 3. Upcoming Section (Shown on 'all' or 'upcoming' tab) */}
      {(activeTab === 'all' || activeTab === 'upcoming') && (
        <section className="meetings-section-block">
          <div className="meetings-section-title-row">
            <h2 className="meetings-section-heading">Upcoming</h2>
            <span className="meetings-section-subcount">
              {upcomingMeetings.length === 0 ? '0 scheduled' : `${upcomingMeetings.length} scheduled`}
            </span>
          </div>

          {upcomingMeetings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {upcomingMeetings.map((m) => {
                const isDispatchingThis = dispatchingBotId === m.id;
                const isInCallThis = m.status === 'in_progress' || m.status === 'bot_dispatched';
                const isExpired = isMeetingExpired(m);
                const isSkipped = m.status === 'skipped';

                return (
                  <div key={m.id} className="meetings-upcoming-card">
                    {/* Top-Right Corner Glass Action Button: 36px visible / 44px hit area with hover/focus tooltip */}
                    <div className="card-glass-action-wrapper">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteMeeting(m.id);
                        }}
                        className={`card-glass-x-btn ${isInCallThis ? 'btn-stop-bot' : ''}`}
                        aria-label={isInCallThis ? 'Stop bot' : 'Delete meeting'}
                        data-tooltip={isInCallThis ? 'Stop bot' : 'Delete meeting'}
                      >
                        {isInCallThis ? <Square size={13} fill="currentColor" /> : <X size={15} />}
                      </button>
                    </div>

                    {/* Top Tier: Badges and Meeting Title (Padded right to clear ✕ button) */}
                    <div className="meetings-upcoming-card-top">
                      <div className="dash-hero-badges-row" style={{ marginBottom: '12px' }}>
                        {isSkipped ? (
                          <span className="dash-pill-badge dash-pill-skipped">Skipped</span>
                        ) : isExpired ? (
                          <span className="dash-pill-badge dash-pill-expired">Expired</span>
                        ) : (
                          <span className="dash-pill-badge dash-pill-scheduled">Scheduled</span>
                        )}
                        <span className="dash-pill-badge dash-pill-meet">
                          {m.external_calendar_id ? 'Google Meet' : 'Ad-hoc Meet'}
                        </span>
                      </div>

                      <h3 className="dash-hero-title" style={{ fontSize: '1.45rem', marginBottom: '8px' }}>
                        {m.title}
                      </h3>
                    </div>

                    {/* Bottom Tier: Date & Bot Status on Left, Action Toolbar on Right */}
                    <div className="meetings-upcoming-card-bottom">
                      <div className="meetings-card-meta-row">
                        <div className="meetings-meta-time">
                          <Clock size={14} color="#64748B" />
                          <span>
                            {m.start_time
                              ? new Date(m.start_time).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Scheduled'}
                          </span>
                        </div>

                        <div className="meetings-meta-bot-status">
                          {isSkipped ? (
                            <>
                              <span className="meetings-gray-dot" />
                              <span style={{ color: '#FBBF24' }}>Skipped (bot will not join)</span>
                            </>
                          ) : isExpired ? (
                            <>
                              <span className="meetings-gray-dot" />
                              <span style={{ color: '#7F8AA0' }}>Meeting time passed (not attended)</span>
                            </>
                          ) : (
                            <>
                              <span className="meetings-amber-dot" />
                              <span>
                                {isInCallThis ? 'Bot is in call and transcribing' : "The bot hasn't been sent yet"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Toolbar - Send bot now, Open in Meet, View details */}
                      <div className="dash-hero-action-bar">
                        {!isExpired && !isSkipped && !isInCallThis && (
                          <button
                            type="button"
                            onClick={() => handleDispatch(m.id)}
                            disabled={isDispatchingThis}
                            className="dash-btn-primary"
                          >
                            <Send size={15} />
                            <span>{isDispatchingThis ? 'Joining...' : 'Send bot now'}</span>
                          </button>
                        )}

                        {isInCallThis && (
                          <button
                            type="button"
                            onClick={() => syncBotTranscript(m.id)}
                            className="dash-btn-primary"
                            style={{ background: '#2563EB', borderColor: '#3B82F6' }}
                            title="Fetch finished transcript from Recall.ai"
                          >
                            <RefreshCw size={14} />
                            <span>Sync Transcript</span>
                          </button>
                        )}

                        {m.meeting_url && !isExpired && (
                          <a
                            href={m.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dash-btn-glass btn-meet-responsive"
                            aria-label={`Open ${m.title} in Google Meet`}
                            data-tooltip={`Open ${m.title} in Google Meet`}
                          >
                            <ExternalLink size={14} />
                            <span className="dash-btn-meet-text">Open in Meet</span>
                          </a>
                        )}

                        <Link
                          href={`/meetings/${m.id}`}
                          className="dash-link-details"
                          aria-label={`View details for ${m.title}`}
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="meetings-upcoming-card" style={{ padding: '32px 20px', textAlign: 'center', color: '#A3ACC0' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                No upcoming meetings scheduled. Paste a Google Meet link or sync your calendar above.
              </p>
            </div>
          )}
        </section>
      )}

      {/* 4. Completed Section (Shown on 'all' or 'completed' tab) */}
      {(activeTab === 'all' || activeTab === 'completed') && (
        <section className="meetings-section-block">
          <div className="meetings-section-title-row">
            <h2 className="meetings-section-heading">Completed</h2>
            <span className="meetings-section-subcount">
              {completedMeetings.length === 0
                ? '0 meetings'
                : `${completedMeetings.length} meeting${completedMeetings.length > 1 ? 's' : ''}, all summarized`}
            </span>
          </div>

          <div className="meetings-table-container">
            {/* 5-Column Table Header */}
            <div className="meetings-grid-header">
              <span>Meeting</span>
              <span>Date</span>
              <span>Length</span>
              <span>Captured</span>
              <span style={{ textAlign: 'right' }}></span>
            </div>

            {/* Rows List */}
            <div className="dash-rows-list">
              {completedMeetings.length > 0 ? (
                completedMeetings.map((m) => {
                  const decisionsCount = m.decision_count ?? 0;
                  const jiraTasks = m.jira_tasks_count ?? 0;
                  const duration = formatDuration(m.duration_seconds);

                  const dateObj = m.start_time ? new Date(m.start_time) : new Date();
                  const dateDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const dateTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                  return (
                    <Link
                      key={m.id}
                      href={`/meetings/${m.id}`}
                      className="meetings-grid-row"
                    >
                      {/* Col 1: Meeting Title & Source */}
                      <div className="m-cell-title">
                        <span className="m-title-text">{m.title}</span>
                        <span className="m-source-sub">
                          {m.external_calendar_id ? 'Google Meet' : 'Ad-hoc'}
                        </span>
                      </div>

                      {/* Col 2: Date */}
                      <div className="m-cell-date">
                        <span className="m-date-day">{dateDay}</span>
                        <span className="m-date-time">{dateTime}</span>
                      </div>

                      {/* Col 3: Length */}
                      <div className="m-cell-length">{duration}</div>

                      {/* Col 4: Captured Outcomes */}
                      <div className="m-cell-captured">
                        {decisionsCount > 0 ? (
                          <span className="m-pill-dark">
                            {decisionsCount} decision{decisionsCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="m-pill-dark">Transcribed</span>
                        )}

                        {jiraTasks > 0 ? (
                          <span className="m-pill-blue">
                            {jiraTasks} task{jiraTasks > 1 ? 's' : ''} synced to Jira
                          </span>
                        ) : (
                          <span className="m-pill-dark">No action items</span>
                        )}
                      </div>

                      {/* Col 5: Arrow */}
                      <div className="m-cell-arrow">
                        <ChevronRight size={16} />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#A3ACC0', fontSize: '14px' }}>
                  No completed meetings yet. Summaries will appear here after calls conclude.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Ad-Hoc Meeting Modal */}
      <AdHocMeetingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onMeetingCreated={(newM) => addMeeting(newM)}
      />

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
    </div>
  );
}
