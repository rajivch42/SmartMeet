'use client';

import { useState } from 'react';
import UpcomingMeetingsList from '@/components/meetings/UpcomingMeetingsList';
import { useDashboard } from '@/lib/context/DashboardContext';
import { Meeting } from '@/types/database';
import Link from 'next/link';
import {
  Video,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
  CheckSquare,
  ExternalLink,
  Users,
} from 'lucide-react';

export default function MeetingsPage() {
  const { meetings, meetingsLoading } = useDashboard();
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');

  // Unified completion predicate: status summarized/transcribed or has recorded decisions/summaries
  const isMeetingCompleted = (m: Meeting) =>
    m.status === 'summarized' ||
    m.status === 'transcribed' ||
    (m.decision_count != null && m.decision_count > 0);

  const upcomingMeetings = meetings.filter((m) => !isMeetingCompleted(m));
  const completedMeetings = meetings.filter((m) => isMeetingCompleted(m));

  const formatMeetingDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (meeting: Meeting) => {
    if (meeting.duration_seconds && meeting.duration_seconds > 0) {
      if (meeting.duration_seconds < 60) {
        return `${Math.round(meeting.duration_seconds)}s`;
      }
      const mins = Math.round(meeting.duration_seconds / 60);
      return `${mins} min`;
    }
    if (meeting.start_time && meeting.end_time) {
      const diff = Math.max(
        1,
        Math.round(
          (new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000
        )
      );
      return `${diff} min`;
    }
    return '25 min';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <div className="icon-container-accent" style={{ width: '40px', height: '40px' }}>
              <Video size={20} />
            </div>
            <h1 className="type-h1 gradient-text-animated">Meeting Sessions &amp; Schedule</h1>
          </div>
          <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Review upcoming scheduled Google Meet calls, dispatch virtual bots, and inspect completed transcriptions.
          </p>
        </div>

        {/* View Filter Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`btn btn-sm ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Upcoming ({upcomingMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`btn btn-sm ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Completed ({completedMeetings.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: UPCOMING MEETINGS (Rendered in 3-per-line grid) */}
      {(activeTab === 'all' || activeTab === 'upcoming') && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <UpcomingMeetingsList layout="grid" />
        </section>
      )}

      {/* Divider if both sections visible */}
      {activeTab === 'all' && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-2) 0' }} />
      )}

      {/* SECTION 2: RECENT COMPLETED MEETINGS (Rendered in 3-per-line grid) */}
      {(activeTab === 'all' || activeTab === 'completed') && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: 'var(--gold-bg)', border: '1px solid rgba(242, 185, 77, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="var(--gold)" />
              </div>
              <h2 className="type-h2" style={{ fontSize: '1.15rem' }}>Recent Completed Meetings</h2>
              <span className="badge badge-resolved" style={{ marginLeft: 'var(--space-2)' }}>
                <span className="node-gold-dot" style={{ width: '6px', height: '6px' }} /> {completedMeetings.length} Resolved
              </span>
            </div>
          </div>

          {meetingsLoading ? (
            <div className="meetings-grid-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="card skeleton-shimmer" style={{ height: '170px' }} />
              ))}
            </div>
          ) : completedMeetings.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 'var(--space-8) var(--space-6)',
                textAlign: 'center',
                border: '1px dashed var(--border-default)',
              }}
            >
              <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto var(--space-3)', display: 'block' }} />
              <h3 className="type-h3" style={{ marginBottom: 'var(--space-2)' }}>No Completed Meetings Yet</h3>
              <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 auto' }}>
                Completed Google Meet sessions will appear here once audio has been transcribed and summarized.
              </p>
            </div>
          ) : (
            <div className="meetings-grid-3">
              {completedMeetings.map((m, idx) => {
                const durationText = formatDuration(m);
                const dateText = formatMeetingDate(m.start_time);
                const decisionCount = m.decision_count ?? 0;
                const jiraTasksCount = m.jira_tasks_count ?? 0;
                const tasksCount = m.tasks_count ?? 0;
                const isRecent = idx === 0;

                return (
                  <div
                    key={m.id}
                    className={`card card-interactive ${isRecent ? 'card-resolved-recent' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                      borderLeft: isRecent ? '3px solid var(--gold)' : '3px solid var(--border-default)',
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
                        <span className="badge badge-resolved" style={{ fontSize: '0.7rem' }}>
                          <span className="node-gold-dot" style={{ width: '6px', height: '6px' }} /> Resolved
                        </span>
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
                          gap: 'var(--space-3)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          marginBottom: 'var(--space-2)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} className="icon-hover-rotate" color="var(--cyan)" /> {durationText}
                        </span>
                        <span>•</span>
                        <span>{dateText}</span>
                      </div>

                      {m.attendees && m.attendees.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            marginBottom: 'var(--space-2)',
                          }}
                        >
                          <Users size={12} />
                          <span>{m.attendees.length} attendee{m.attendees.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                        {decisionCount > 0 ? (
                          <span
                            className="badge badge-cyan"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          >
                            <Layers size={10} /> {decisionCount} Decision{decisionCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span
                            className="badge badge-cyan"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', opacity: 0.8 }}
                          >
                            <FileText size={10} /> Transcribed
                          </span>
                        )}

                        {jiraTasksCount > 0 ? (
                          <span
                            className="badge badge-resolved"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          >
                            <span className="badge-jira" style={{ padding: '1px 3px', borderRadius: '2px', fontSize: '0.6rem' }}>
                              Jira
                            </span>
                            {jiraTasksCount} Synced Task{jiraTasksCount > 1 ? 's' : ''}
                          </span>
                        ) : tasksCount > 0 ? (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          >
                            <CheckSquare size={10} /> {tasksCount} Action Item{tasksCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.45rem',
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            0 Action Items
                          </span>
                        )}
                      </div>
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
                      }}
                    >
                      {m.meeting_url ? (
                        <a
                          href={m.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Video size={12} color="var(--status-success)" />
                          Meet <ExternalLink size={10} className="icon-hover-arrow" />
                        </a>
                      ) : (
                        <div />
                      )}

                      <Link
                        href={`/meetings/${m.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <FileText size={12} className="icon-hover-zoom" /> View Detail
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
