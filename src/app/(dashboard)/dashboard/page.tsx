'use client';

import {
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  CheckSquare,
  ShieldCheck,
  FileText,
  ArrowRight,
  Video,
} from 'lucide-react';
import UpcomingMeetingsList from '@/components/meetings/UpcomingMeetingsList';
import { useDashboard } from '@/lib/context/DashboardContext';
import { Meeting } from '@/types/database';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    meetings,
    meetingsLoading,
    taskCount,
    syncedCount,
    timeSaved,
    syncCalendar,
    syncingCalendar,
  } = useDashboard();

  // Unified completion predicate: status summarized/transcribed or has recorded decisions/summaries
  const isMeetingCompleted = (m: Meeting) =>
    m.status === 'summarized' ||
    m.status === 'transcribed' ||
    (m.decision_count != null && m.decision_count > 0);

  // Strictly segregate upcoming vs completed meetings
  const upcomingMeetings = meetings.filter((m) => !isMeetingCompleted(m));
  const completedMeetings = meetings.filter((m) => isMeetingCompleted(m));

  // Show only recent 5 on Dashboard; rest in Meetings tab per request
  const displayedCompleted = completedMeetings.slice(0, 5);

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
      {/* Top Welcome & Actions Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <div className="icon-container-accent" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)' }}>
              <Sparkles size={20} />
            </div>
            <h1 className="type-h1 gradient-text-animated">AI Meeting Assistant Platform</h1>
          </div>
          <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Autonomous workplace dialogue intelligence: Google Meet dispatch, diarization, Claude &amp; Gemini summaries, and Jira synchronization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="badge badge-success" style={{ padding: '0.35rem 0.75rem', boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)' }}>
            <ShieldCheck size={14} style={{ marginRight: 'var(--space-1)' }} />
            Operational
          </div>
        </div>
      </div>

      {/* Quick Stats Bar (Hero + Two Supporting) */}
      {meetingsLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div className="card skeleton-shimmer" style={{ height: '120px' }} />
          <div className="card skeleton-shimmer" style={{ height: '120px' }} />
          <div className="card skeleton-shimmer" style={{ height: '120px' }} />
        </div>
      ) : meetings.length === 0 ? (
        /* Empty State: Center prompt rather than showing three zeros */
        <div
          className="card"
          style={{
            padding: 'var(--space-10) var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <Calendar size={44} color="var(--primary)" style={{ opacity: 0.8 }} />
          <h2 className="type-h2">Connect Google Calendar to start tracking meetings</h2>
          <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            AutoSync Meet will monitor your schedule, automatically dispatch the recording bot, and synthesize action items.
          </p>
          <button
            onClick={() => syncCalendar()}
            disabled={syncingCalendar}
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-2)' }}
          >
            <Calendar size={16} color="var(--brand-google)" />
            {syncingCalendar ? 'Connecting Calendar...' : 'Sync Calendar'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* HERO METRIC CARD: Time Saved (Resolved Product Outcome) */}
          <div className="card card-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span className="type-caption" style={{ color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Value Proposition
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--gold-bg)', border: '1px solid rgba(242, 185, 77, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} color="var(--gold)" />
              </div>
            </div>
            <div className="type-display" style={{ marginBottom: 'var(--space-1)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {timeSaved || '4.5 hrs'}
            </div>
            <div className="type-body-medium" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              Time saved in autonomous synthesis &amp; Jira sync
            </div>
          </div>

          {/* SUPPORTING CARD 1: Upcoming Calls (Filtered Strictly to Upcoming) */}
          <div className="card card-interactive">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span className="type-caption" style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Upcoming Calls Today
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--blue-bg)', border: '1px solid rgba(62, 142, 247, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={14} color="var(--blue)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span className="node-pulse-dot" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600 }}>Bot Ready</span>
                </div>
              </div>
            </div>
            <div className="type-display" style={{ marginBottom: 'var(--space-1)', fontSize: '2.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {upcomingMeetings.length}
            </div>
            <div className="type-caption" style={{ color: 'var(--text-secondary)' }}>
              {upcomingMeetings.length === 1 ? '1 call' : `${upcomingMeetings.length} calls`} awaiting dispatch
            </div>
          </div>

          {/* SUPPORTING CARD 2: Action Items Extracted */}
          <div className="card card-interactive">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span className="type-caption" style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Action Items Extracted
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--gold-bg)', border: '1px solid rgba(242, 185, 77, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare size={14} color="var(--gold)" />
                </div>
                <span className="badge badge-jira" style={{ fontSize: '0.7rem' }}>
                  Jira Cloud
                </span>
              </div>
            </div>
            <div className="type-display" style={{ marginBottom: 'var(--space-1)', fontSize: '2.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {taskCount}
            </div>
            <div className="type-caption" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--gold)' }}>{syncedCount}</strong> of {taskCount} synced to Jira Cloud
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Upcoming Today + Recent Completed Meetings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Scheduled Upcoming Meetings (Max 5 on Dashboard per Spec) */}
        <div>
          <UpcomingMeetingsList maxItems={5} layout="stack" />
        </div>

        {/* Right Column: Recent Completed Meetings (Max 5 on Dashboard per Spec) */}
        <div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={18} color="var(--accent-cyan)" />
                <h3 className="type-h3">Recent Completed Meetings</h3>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                {completedMeetings.length} Summarized
              </span>
            </div>

            {completedMeetings.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>No meetings completed yet. Run a Google Meet session to see summaries.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {displayedCompleted.map((m, idx) => {
                  const durationText = formatDuration(m);
                  const dateText = formatMeetingDate(m.start_time);
                  const decisionCount = m.decision_count ?? 0;
                  const jiraTasksCount = m.jira_tasks_count ?? 0;
                  const tasksCount = m.tasks_count ?? 0;
                  // Gold Recency Rule (§2.2): only the most recent completed meeting gets atmospheric glow
                  const isRecent = idx === 0;

                  return (
                    <Link
                      key={m.id}
                      href={`/meetings/${m.id}`}
                      className={`card card-interactive ${isRecent ? 'card-resolved-recent' : ''}`}
                      style={{
                        padding: 'var(--space-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        borderLeft: isRecent ? '3px solid var(--gold)' : '3px solid var(--border-default)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                        <strong className="text-title-interactive" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {m.title}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-resolved" style={{ fontSize: '0.7rem' }}>
                            <span className="node-gold-dot" style={{ width: '6px', height: '6px' }} /> Resolved
                          </span>
                          <ArrowRight size={13} className="icon-hover-arrow" style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} className="icon-hover-rotate" color="var(--cyan)" /> {durationText}
                        </span>
                        <span>•</span>
                        <span>{dateText}</span>
                        <span>•</span>
                        <span>{m.external_calendar_id ? 'Google Meet' : 'Ad-Hoc Meet'}</span>
                      </div>

                      {/* Dynamic, Per-Meeting Preview Pills */}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-1)' }}>
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
                    </Link>
                  );
                })}

                {completedMeetings.length > 5 && (
                  <div style={{ textAlign: 'center', paddingTop: 'var(--space-1)' }}>
                    <Link
                      href="/meetings"
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      View all {completedMeetings.length} completed meetings in Meetings tab <ArrowRight size={13} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
