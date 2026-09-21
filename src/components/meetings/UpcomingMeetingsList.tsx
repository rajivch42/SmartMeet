'use client';

import { useState, useEffect } from 'react';
import { Meeting } from '@/types/database';
import { useDashboard } from '@/lib/context/DashboardContext';
import {
  Calendar,
  Clock,
  Video,
  Users,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  Bot,
  FileText,
  ArrowRight,
} from 'lucide-react';
import AdHocMeetingModal from './AdHocMeetingModal';
import Link from 'next/link';

export default function UpcomingMeetingsList({
  onMeetingCountChange,
  maxItems,
  layout = 'stack',
}: {
  onMeetingCountChange?: (count: number) => void;
  maxItems?: number;
  layout?: 'stack' | 'grid';
}) {
  const {
    meetings,
    meetingsLoading: loading,
    syncingCalendar: syncing,
    dispatchingBotId: dispatchingId,
    statusMessage,
    syncCalendar,
    dispatchBot,
    syncBotTranscript,
    addMeeting,
  } = useDashboard();

  const [modalOpen, setModalOpen] = useState(false);
  const [syncingBotId, setSyncingBotId] = useState<string | null>(null);

  // Filter strictly to meetings that are UPCOMING or currently in progress
  const upcomingMeetings = meetings.filter(
    (m) => m.status !== 'summarized' && m.status !== 'transcribed'
  );

  const displayedMeetings = maxItems ? upcomingMeetings.slice(0, maxItems) : upcomingMeetings;

  useEffect(() => {
    if (onMeetingCountChange) {
      onMeetingCountChange(upcomingMeetings.length);
    }
  }, [upcomingMeetings.length, onMeetingCountChange]);

  const handleSyncCalendar = async () => {
    await syncCalendar();
  };

  const handleDispatchBot = async (meetingId: string) => {
    await dispatchBot(meetingId);
  };

  const handleSyncBot = async (meetingId: string) => {
    try {
      setSyncingBotId(meetingId);
      await syncBotTranscript(meetingId);
    } finally {
      setSyncingBotId(null);
    }
  };

  const handleMeetingCreated = (newMeeting: Meeting) => {
    addMeeting(newMeeting);
  };

  const formatMeetingDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bot_dispatched':
      case 'in_progress':
        return (
          <span className="badge badge-live">
            <span className="node-pulse-dot" />
            In Call
          </span>
        );
      default:
        return (
          <span className="badge badge-info">
            <span className="node-pulse-dot" style={{ animation: 'none', opacity: 0.8 }} />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--blue-bg)',
              border: '1px solid rgba(62, 142, 247, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue)',
            }}
          >
            <Calendar size={18} />
          </div>
          <h2 className="type-h2" style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Upcoming Google Meet Calls
          </h2>
          <span className="badge badge-secondary" style={{ marginLeft: 'var(--space-1)' }}>
            {upcomingMeetings.length} Scheduled
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-secondary btn-sm"
          >
            <PlusCircle size={14} className="icon-hover-rotate" /> Paste Meet Link
          </button>
          <button
            onClick={handleSyncCalendar}
            disabled={syncing}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} className={syncing ? 'status-dot-pulse' : 'icon-hover-rotate'} />
            {syncing ? 'Syncing...' : 'Sync Calendar Now'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className="badge badge-success"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <CheckCircle2 size={15} /> {statusMessage}
        </div>
      )}

      {/* Meeting Cards List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2].map((n) => (
            <div key={n} className="card skeleton-shimmer" style={{ height: '140px' }} />
          ))}
        </div>
      ) : upcomingMeetings.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 'var(--space-8) var(--space-6)',
            textAlign: 'center',
            border: '1px dashed var(--border-default)',
          }}
        >
          <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto var(--space-3)', display: 'block' }} />
          <h3 className="type-h3" style={{ marginBottom: 'var(--space-2)' }}>No Upcoming Meetings</h3>
          <p
            className="prose-limit"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              margin: '0 auto var(--space-5)',
            }}
          >
            All meetings are completed and transcribed. Click &ldquo;Sync Calendar Now&rdquo; to fetch new upcoming Google Meet events or paste an ad-hoc link.
          </p>
          <button onClick={handleSyncCalendar} disabled={syncing} className="btn btn-primary">
            <RefreshCw size={14} /> Sync Calendar Now
          </button>
        </div>
      ) : (
        <>
          <div
            className={layout === 'grid' ? 'meetings-grid-3' : ''}
            style={layout === 'grid' ? undefined : { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            {displayedMeetings.map((m) => {
              const isDispatching = dispatchingId === m.id;
              const isInCall = m.status === 'in_progress' || m.status === 'bot_dispatched';

              return (
                <div
                  key={m.id}
                  className={`card card-interactive ${isInCall ? 'card-live' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    borderLeft: isInCall ? '3px solid var(--blue)' : '3px solid var(--border-default)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      {getStatusBadge(m.status)}
                      <span className="badge badge-google" style={{ fontSize: '0.7rem' }}>
                        <Calendar size={10} />
                        {m.external_calendar_id ? 'Google Meet' : 'Ad-Hoc'}
                      </span>
                    </div>

                    <Link href={`/meetings/${m.id}`}>
                      <h3
                        className="type-h3 text-title-interactive"
                        style={{
                          marginBottom: 'var(--space-2)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {m.title}
                      </h3>
                    </Link>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      <Clock size={13} className="icon-hover-rotate" color="var(--primary)" />
                      <span>{formatMeetingDate(m.start_time)}</span>
                    </div>

                    {m.attendees && m.attendees.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Users size={13} />
                        <span>
                          {m.attendees.length} attendee{m.attendees.length > 1 ? 's' : ''} (
                          {m.attendees
                            .slice(0, 2)
                            .map((a) => a.name || a.email.split('@')[0])
                            .join(', ')}
                          {m.attendees.length > 2 ? `, +${m.attendees.length - 2} more` : ''})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--border-subtle)',
                      gap: 'var(--space-2)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <a
                      href={m.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Video size={13} color="var(--status-success)" />
                      Meet <ExternalLink size={10} className="icon-hover-arrow" />
                    </a>

                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Link
                        href={`/meetings/${m.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <FileText size={13} className="icon-hover-zoom" /> View Detail
                      </Link>

                      {m.status === 'bot_dispatched' || m.status === 'in_progress' ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                          disabled={syncingBotId === m.id}
                          onClick={() => handleSyncBot(m.id)}
                          title="Fetch latest status or download transcript from Recall.ai"
                        >
                          <RefreshCw size={12} className={syncingBotId === m.id ? 'status-dot-pulse' : 'icon-hover-rotate'} />
                          {syncingBotId === m.id ? 'Fetching...' : 'Fetch Transcript'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                          disabled={isDispatching}
                          onClick={() => handleDispatchBot(m.id)}
                        >
                          <Bot size={13} className="icon-hover-rotate" />
                          {isDispatching ? 'Joining...' : 'Dispatch Bot Now'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {maxItems && upcomingMeetings.length > maxItems && (
            <div style={{ textAlign: 'center', paddingTop: 'var(--space-1)' }}>
              <Link href="/meetings" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                View all {upcomingMeetings.length} upcoming meetings in Meetings tab <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </>
      )}

      {/* Ad-Hoc Meeting Modal */}
      <AdHocMeetingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onMeetingCreated={handleMeetingCreated}
      />
    </div>
  );
}
