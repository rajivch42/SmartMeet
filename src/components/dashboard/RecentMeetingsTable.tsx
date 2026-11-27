'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Meeting } from '@/types/database';

interface RecentMeetingsTableProps {
  meetings: Meeting[];
}

export default function RecentMeetingsTable({ meetings }: RecentMeetingsTableProps) {
  const sortedMeetings = [...meetings].sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || a.start_time || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || b.start_time || 0).getTime();
    return timeB - timeA;
  });

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins} min ${secs} sec`;
    if (mins > 0) return `${mins} min`;
    return `${secs} sec`;
  };

  return (
    <div className="dash-table-card">
      {/* Table Header */}
      <div className="dash-table-header">
        <h3 className="dash-table-title">Recent meetings</h3>
        <span className="dash-table-count">
          {meetings.length === 0
            ? '0 summarized'
            : `${meetings.length} summarized`}
        </span>
      </div>

      {/* Rows List */}
      <div className="dash-rows-list">
        {sortedMeetings.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#A3ACC0', fontSize: '14px' }}>
            No meetings summarized yet. Completed meetings with summaries will appear here.
          </div>
        ) : (
          sortedMeetings.slice(0, 5).map((m) => {
            const decisionsCount = m.decision_count ?? 0;
            const isJiraSynced = Boolean(m.jira_tasks_count && m.jira_tasks_count > 0);
            const duration = formatDuration(m.duration_seconds);

            const dateDisplay = m.start_time
              ? `${new Date(m.start_time).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}, ${m.external_calendar_id ? 'Google Meet' : 'Ad-hoc Meet'}`
              : 'Google Meet';

            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="dash-meeting-row"
              >
                {/* Left Info */}
                <div className="dash-row-left">
                  <span className="dash-row-title">{m.title}</span>
                  <span className="dash-row-sub">
                    {duration} &nbsp;{dateDisplay}
                  </span>
                </div>

                {/* Middle Outcome Badges */}
                <div className="dash-row-badges">
                  {decisionsCount > 0 ? (
                    <span className="dash-tag-dark">
                      {decisionsCount} decision{decisionsCount > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="dash-tag-dark">Transcribed</span>
                  )}

                  {isJiraSynced ? (
                    <span className="dash-tag-blue">
                      {m.jira_tasks_count} task{m.jira_tasks_count! > 1 ? 's' : ''} synced to Jira
                    </span>
                  ) : (
                    <span className="dash-tag-dark">No action items</span>
                  )}

                  {/* Jira / Slack micro logos */}
                  {isJiraSynced && (
                    <div className="dash-row-icons">
                      <span className="dash-row-jira-dot" title="Jira synced">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M11.5 2L2 11.5L11.5 21L21 11.5L11.5 2Z" fill="#2684FF" />
                        </svg>
                      </span>
                      <span className="dash-row-slack-dot" title="Slack notified">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="6" fill="#2EB67D" />
                        </svg>
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Status */}
                <div className="dash-row-right">
                  <span className="dash-status-resolved">
                    <span className="dash-resolved-dot" /> Resolved
                  </span>
                  <ChevronRight size={16} className="dash-chevron-icon" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div className="dash-table-footer">
        <Link href="/meetings" className="dash-view-all-link">
          View all meetings
        </Link>
      </div>
    </div>
  );
}
