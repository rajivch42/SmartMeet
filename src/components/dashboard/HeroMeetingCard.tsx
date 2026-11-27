'use client';

import React from 'react';
import Link from 'next/link';
import { Send, ExternalLink, Clock, Video, X, Square, RefreshCw } from 'lucide-react';
import { Meeting } from '@/types/database';

interface HeroMeetingCardProps {
  meeting: Meeting | null;
  onDispatch: (id: string) => void;
  dispatchingId: string | null;
  onDelete?: (id: string) => void;
  onSkip?: (id: string) => void;
  onStopBot?: (id: string) => void;
  onSyncBot?: (id: string) => void;
}

export default function HeroMeetingCard({
  meeting,
  onDispatch,
  dispatchingId,
  onDelete,
  onSkip,
  onStopBot,
  onSyncBot,
}: HeroMeetingCardProps) {
  if (!meeting) {
    return (
      <div className="dash-hero-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '260px', textAlign: 'center', padding: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#12151F', border: '1px solid #1D2232', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#8FA6F5' }}>
          <Video size={24} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#F3F4FA', marginBottom: '8px' }}>
          No upcoming meetings scheduled
        </h3>
        <p style={{ fontSize: '14px', color: '#A3ACC0', maxWidth: '380px', marginBottom: '20px', lineHeight: 1.5 }}>
          Paste a Google Meet link or sync your Google Calendar above to have the bot attend your upcoming calls.
        </p>
      </div>
    );
  }

  const displayTitle = meeting.title || 'Untitled Meeting';
  const displayDate = meeting.start_time
    ? new Date(meeting.start_time).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Upcoming';

  const isDispatching = dispatchingId === meeting.id;
  const isInCall = meeting.status === 'in_progress' || meeting.status === 'bot_dispatched';
  const isSummarized = meeting.status === 'summarized';
  const isSkipped = meeting.status === 'skipped';

  // Check if scheduled meeting time passed more than 24 hours ago
  const isExpired =
    !isSummarized &&
    !isInCall &&
    Boolean(
      meeting.start_time &&
        new Date(meeting.start_time).getTime() < Date.now() - 24 * 60 * 60 * 1000
    );

  const handleTopRightAction = () => {
    if (isInCall) {
      if (onStopBot) onStopBot(meeting.id);
    } else {
      if (onDelete) onDelete(meeting.id);
      else if (onSkip) onSkip(meeting.id);
    }
  };

  return (
    <div className="dash-hero-card" style={{ position: 'relative' }}>
      {/* Top-Right Corner Glass Action Button */}
      {(onDelete || onSkip || onStopBot) && !isSummarized && (
        <div className="card-glass-action-wrapper">
          <button
            type="button"
            onClick={handleTopRightAction}
            className={`card-glass-x-btn ${isInCall ? 'btn-stop-bot' : ''}`}
            aria-label={isInCall ? 'Stop bot' : 'Delete meeting'}
            data-tooltip={isInCall ? 'Stop bot' : 'Delete meeting'}
          >
            {isInCall ? <Square size={13} fill="currentColor" /> : <X size={15} />}
          </button>
        </div>
      )}

      {/* Top Badges Row */}
      <div className="dash-hero-badges-row">
        {isSkipped ? (
          <span className="dash-pill-badge dash-pill-skipped">Skipped</span>
        ) : isExpired ? (
          <span className="dash-pill-badge dash-pill-expired">Expired</span>
        ) : (
          <span className="dash-pill-badge dash-pill-scheduled">
            {isInCall ? 'In Call' : isSummarized ? 'Completed' : 'Scheduled'}
          </span>
        )}
        <span className="dash-pill-badge dash-pill-meet">
          {meeting.external_calendar_id ? 'Google Meet' : 'Ad-hoc Meet'}
        </span>
      </div>

      {/* Meeting Title & Timestamp */}
      <h2 className="dash-hero-title">{displayTitle}</h2>
      <div className="dash-hero-time-row">
        <Clock size={14} className="dash-hero-clock-icon" />
        <span>{displayDate}</span>
        {isSkipped && (
          <span style={{ color: '#FBBF24', fontSize: '12px', marginLeft: '6px' }}>
            (Bot will not join)
          </span>
        )}
        {isExpired && !isSkipped && (
          <span style={{ color: '#7F8AA0', fontSize: '12px', marginLeft: '6px' }}>
            (Meeting time passed)
          </span>
        )}
      </div>

      {/* 4-Stage Stepper Progress Line */}
      <div className="dash-stepper-container">
        {/* Progress Line */}
        <div className="dash-stepper-track">
          <div
            className="dash-stepper-progress"
            style={{
              width: isInCall ? '50%' : isSummarized ? '100%' : '25%',
            }}
          />
        </div>

        {/* 4 Milestones */}
        <div className="dash-stepper-steps">
          {/* Step 1: Joins */}
          <div className="dash-step-item active">
            <div className="dash-step-dot" />
            <span className="dash-step-name">Joins</span>
            <span className="dash-step-desc">Enters the call</span>
          </div>

          {/* Step 2: Transcribes */}
          <div className={`dash-step-item ${isInCall || isSummarized ? 'active' : ''}`}>
            <div className="dash-step-dot" />
            <span className="dash-step-name">Transcribes</span>
            <span className="dash-step-desc">Captures speakers</span>
          </div>

          {/* Step 3: Summarizes */}
          <div className={`dash-step-item ${isSummarized ? 'active' : ''}`}>
            <div className="dash-step-dot" />
            <span className="dash-step-name">Summarizes</span>
            <span className="dash-step-desc">Extracts decisions</span>
          </div>

          {/* Step 4: Syncs */}
          <div className={`dash-step-item ${isSummarized ? 'active' : ''}`}>
            <div className="dash-step-dot" />
            <span className="dash-step-name">Syncs</span>
            <span className="dash-step-desc">Updates Jira &amp; Slack</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar - Send bot now, Open in Meet, View details only */}
      <div className="dash-hero-action-bar">
        {!isExpired && !isSkipped && !isInCall && (
          <button
            type="button"
            onClick={() => onDispatch(meeting.id)}
            disabled={isDispatching}
            className="dash-btn-primary"
          >
            <Send size={15} />
            <span>{isDispatching ? 'Joining...' : 'Send bot now'}</span>
          </button>
        )}

        {isInCall && (
          <button
            type="button"
            onClick={() => onSyncBot && onSyncBot(meeting.id)}
            className="dash-btn-primary"
            style={{ background: '#2563EB', borderColor: '#3B82F6' }}
            title="Fetch finished transcript from Recall.ai"
          >
            <RefreshCw size={14} />
            <span>Sync Transcript</span>
          </button>
        )}

        {meeting.meeting_url && !isExpired && (
          <a
            href={meeting.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-btn-glass btn-meet-responsive"
            aria-label={`Open ${displayTitle} in Google Meet`}
            data-tooltip={`Open ${displayTitle} in Google Meet`}
          >
            <ExternalLink size={14} />
            <span className="dash-btn-meet-text">Open in Meet</span>
          </a>
        )}

        <Link
          href={`/meetings/${meeting.id}`}
          className="dash-link-details"
          aria-label={`View details for ${displayTitle}`}
        >
          View details
        </Link>
      </div>
    </div>
  );
}
