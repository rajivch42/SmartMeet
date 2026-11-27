'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  ExternalLink,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  AlertCircle,
  RefreshCw,
  Video,
} from 'lucide-react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { Meeting, Summary, Transcript, ActionItem } from '@/types/database';

interface DiarizedTurn {
  speaker: string;
  initials: string;
  avatarColor: string;
  time: string;
  tag?: string | null;
  tagClass?: string;
  isCommitment?: boolean;
  text: string;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const { pushTaskToJira, refreshAll } = useDashboard();

  // Selected Tab inside the Right Intelligence Card
  const [activeTab, setActiveTab] = useState<'summary' | 'tasks' | 'ask'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Real Meeting Detail fetched from GET /api/meetings/[id]
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // Action loading states
  const [pushingJira, setPushingJira] = useState(false);
  const [postingSlack, setPostingSlack] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ask AI state
  const [userQuery, setUserQuery] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [askingAi, setAskingAi] = useState(false);

  // Load meeting data
  const loadMeetingData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (!res.ok) {
        throw new Error(`Failed to load meeting (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error?.message || 'Meeting not found');
      }
      setMeeting(json.data.meeting);
      setTranscript(json.data.transcript || null);
      setSummary(json.data.summary || null);
      setActionItems(json.data.action_items || []);

      // Expand the first discussion point by default if any
      if (json.data.summary?.discussion_points?.length > 0) {
        setExpandedTopics({
          [json.data.summary.discussion_points[0].topic]: true,
        });
      }
    } catch (err: any) {
      setFetchError(err.message || 'Error loading meeting details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) {
      loadMeetingData();
    }
  }, [meetingId]);

  // Color generator for avatar initials
  const getAvatarColor = (name: string) => {
    const colors = ['avatar-blue', 'avatar-purple', 'avatar-green', 'avatar-amber'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Helper to format seconds into mm:ss
  const formatOffset = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Parse raw_text into individual diarized turns, handling both multi-line transcripts
  // and inline timestamp formats like "[00:05] Speaker: text [00:18] Speaker2: text"
  const dialogueTurns = useMemo<DiarizedTurn[]>(() => {
    if (!transcript?.raw_text) return [];

    const raw = transcript.raw_text.trim();
    const turns: DiarizedTurn[] = [];

    // Regex matches markers like:
    // 1) "[00:18] Speaker Name:"
    // 2) "[0:18] Speaker Name:"
    // 3) "Speaker Name [00:18]:"
    // 4) "Speaker Name:" (at start or after newline)
    const markerRegex = /(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:\n\[\]]+?):|([^:\n\[\]]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]:|^([A-Za-z0-9\s._-]+?):\s*)/gm;

    const matches: Array<{
      index: number;
      fullMatchLength: number;
      speaker: string;
      timeStr: string | null;
    }> = [];

    let m: RegExpExecArray | null;
    while ((m = markerRegex.exec(raw)) !== null) {
      const timeStr = m[1] || m[4] || null;
      const speaker = (m[2] || m[3] || m[5] || 'Speaker').trim();

      // Filter out false positives (e.g., if speaker contains purely numbers or exceeds reasonable length)
      if (speaker.length > 0 && speaker.length < 50) {
        matches.push({
          index: m.index,
          fullMatchLength: m[0].length,
          speaker,
          timeStr,
        });
      }
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        const next = matches[i + 1];
        const textStartIndex = cur.index + cur.fullMatchLength;
        const textEndIndex = next ? next.index : raw.length;
        const turnText = raw.slice(textStartIndex, textEndIndex).trim();

        if (!turnText) continue;

        // Clean any leftover standalone timestamp prefixes like "[00:05]" if any remained
        const cleanedText = turnText.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '').trim();

        // Format timestamp string to display e.g. "0:18" or "1:47" instead of "00:18"
        let displayTime = cur.timeStr || formatOffset(i * 15);
        if (displayTime.startsWith('00:')) {
          displayTime = displayTime.slice(3);
        } else if (displayTime.startsWith('0') && displayTime.length === 5) {
          displayTime = displayTime.slice(1);
        }

        // Detect decision or commitment to assign visual badges and tinted cards
        const lower = cleanedText.toLowerCase();
        let tag: string | null = null;
        let tagClass = '';
        let isCommitment = false;

        if (
          lower.includes('will take ownership') ||
          lower.includes('take full ownership') ||
          lower.includes('i will') ||
          lower.includes('by friday') ||
          lower.includes('by thursday') ||
          lower.includes('assign the deliverables')
        ) {
          tag = 'Commitment';
          tagClass = 'mdetail-tag-commitment';
          isCommitment = true;
        } else if (
          lower.includes('decision is to') ||
          lower.includes('first decision') ||
          lower.includes('second decision') ||
          lower.includes('third decision') ||
          lower.includes('we decided') ||
          lower.includes('adopt') ||
          lower.includes('standardize our')
        ) {
          tag = 'Decision';
          tagClass = 'mdetail-tag-decision';
        } else if (
          lower.includes('could you handle') ||
          lower.includes('can you take') ||
          lower.includes('assign')
        ) {
          tag = 'Task Assignment';
          tagClass = 'mdetail-tag-assignment';
        }

        turns.push({
          speaker: cur.speaker,
          initials: getInitials(cur.speaker),
          avatarColor: getAvatarColor(cur.speaker),
          time: displayTime,
          tag,
          tagClass,
          isCommitment,
          text: cleanedText,
        });
      }
    } else {
      // Fallback: split by lines
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      let offsetSec = 0;
      for (const line of lines) {
        turns.push({
          speaker: transcript.speakers?.[0] || 'Speaker',
          initials: getInitials(transcript.speakers?.[0] || 'Speaker'),
          avatarColor: getAvatarColor(transcript.speakers?.[0] || 'Speaker'),
          time: formatOffset(offsetSec),
          text: line,
        });
        offsetSec += 20;
      }
    }

    return turns;
  }, [transcript]);

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  };

  const handlePostSlack = async () => {
    try {
      setPostingSlack(true);
      setStatusMsg(null);
      const res = await fetch('/api/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: 'success', text: 'Meeting summary broadcasted to Slack successfully.' });
      } else {
        setStatusMsg({ type: 'error', text: json.error?.message || 'Slack dispatch failed.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to connect to Slack.' });
    } finally {
      setPostingSlack(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handlePushJira = async () => {
    try {
      setPushingJira(true);
      setStatusMsg(null);
      const res = await fetch('/api/integrations/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: 'success', text: `Action items successfully exported to Jira.` });
        await loadMeetingData();
        await refreshAll();
      } else {
        setStatusMsg({ type: 'error', text: json.error?.message || 'Jira push failed.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to push to Jira.' });
    } finally {
      setPushingJira(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handlePushSingleTask = async (taskId: string) => {
    try {
      const res = await pushTaskToJira(taskId);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Task synced to Jira: ${res.jiraKey}` });
        await loadMeetingData();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to sync task' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to sync task' });
    }
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    try {
      setAskingAi(true);
      const question = userQuery;
      setUserQuery('');

      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, question }),
      });
      const json = await res.json();
      const answer = json.data?.answer || 'No relevant information found in the transcript.';

      setAiAnswers((prev) => [...prev, { q: question, a: answer }]);
    } catch (err: any) {
      setAiAnswers((prev) => [
        ...prev,
        {
          q: userQuery,
          a: `Error generating answer: ${err.message}`,
        },
      ]);
    } finally {
      setAskingAi(false);
    }
  };

  // Filter dialogue by search query
  const filteredDialogue = dialogueTurns.filter(
    (turn) =>
      turn.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turn.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Formatting helpers
  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins} min ${secs} sec`;
    if (mins > 0) return `${mins} min`;
    return `${secs} sec`;
  };

  if (loading) {
    return (
      <div className="mdetail-view-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <RefreshCw size={24} className="dash-spin" style={{ color: '#8FA6F5', margin: '0 auto 16px auto' }} />
        <p style={{ color: '#A3ACC0', fontSize: '14px' }}>Loading meeting details...</p>
      </div>
    );
  }

  if (fetchError || !meeting) {
    return (
      <div className="mdetail-view-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <AlertCircle size={28} style={{ color: '#F87171', margin: '0 auto 16px auto' }} />
        <h2 style={{ color: '#F3F4FA', fontSize: '18px', marginBottom: '8px' }}>Meeting Not Found</h2>
        <p style={{ color: '#A3ACC0', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px auto' }}>
          {fetchError || 'Unable to retrieve the requested meeting.'}
        </p>
        <button
          type="button"
          onClick={loadMeetingData}
          className="dash-btn-primary"
          style={{ margin: '0 auto' }}
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const displayTitle = meeting.title || 'Untitled Meeting';
  const displayDate = meeting.start_time
    ? new Date(meeting.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Scheduled';

  const durationStr = formatDuration(meeting.duration_seconds || transcript?.duration_seconds);
  const speakersCount = transcript?.speakers?.length || (dialogueTurns.length > 0 ? Array.from(new Set(dialogueTurns.map(t => t.speaker))).length : 0);
  const unsyncedTasks = actionItems.filter(t => !t.jira_issue_key);
  const syncedTasksCount = actionItems.filter(t => t.jira_issue_key).length;

  return (
    <div className="mdetail-view-container">
      {/* 1. Breadcrumb */}
      <div className="mdetail-breadcrumb">
        <Link href="/meetings">Meetings</Link>
        <span>/</span>
        <span style={{ color: '#CBD5E1' }}>{displayTitle}</span>
      </div>

      {/* 2. Top Bar */}
      <div className="mdetail-topbar">
        <div className="mdetail-title-group">
          <div className="mdetail-title-row">
            <h1 className="mdetail-title">{displayTitle}</h1>
            <span className="mdetail-status-pill">
              <span className="mdetail-status-dot" /> {meeting.status === 'summarized' ? 'Resolved' : meeting.status}
            </span>
          </div>

          <div className="mdetail-meta-row">
            <span className="mdetail-meta-item">
              <Clock size={13} color="#64748B" />
              <span>{displayDate}</span>
            </span>
            <span>•</span>
            <span>{durationStr}</span>
            {meeting.meeting_url && (
              <>
                <span>•</span>
                <a
                  href={meeting.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mdetail-open-meet-link"
                >
                  <span>Open in Meet</span>
                  <ExternalLink size={12} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons: Post to Slack + Push to Jira */}
        <div className="mdetail-actions-row">
          <button
            type="button"
            onClick={handlePostSlack}
            disabled={postingSlack}
            className="mdetail-slack-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#E01E5A" />
              <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#2EB67D" />
            </svg>
            <span>{postingSlack ? 'Posting...' : 'Post to Slack'}</span>
          </button>

          <button
            type="button"
            onClick={handlePushJira}
            disabled={pushingJira || unsyncedTasks.length === 0}
            className="mdetail-jira-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M11.5 2L2 11.5L11.5 21L21 11.5L11.5 2Z" fill="#FFFFFF" />
            </svg>
            <span>
              {pushingJira
                ? 'Pushing...'
                : unsyncedTasks.length > 0
                ? `Push ${unsyncedTasks.length} to Jira`
                : 'All in Jira'}
            </span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.825rem',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: statusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
            color: statusMsg.type === 'success' ? '#34D399' : '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 3. Main Workspace: Transcript (Left) + Intelligence (Right) */}
      <div className="mdetail-workspace-grid">
        {/* Left Column: Transcript */}
        <div className="mdetail-transcript-card">
          <div className="mdetail-card-header-row">
            <h2 className="mdetail-card-heading">Transcript</h2>
            <span className="mdetail-speakers-count">
              {speakersCount > 0 ? `${speakersCount} speaker${speakersCount > 1 ? 's' : ''}` : 'No speakers'}
            </span>
          </div>

          {/* Search Box */}
          <div className="mdetail-search-wrapper">
            <Search size={15} className="mdetail-search-icon" />
            <input
              type="text"
              placeholder="Search the transcript or a speaker"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mdetail-search-input"
            />
          </div>

          {/* Diarized Speech Turns */}
          <div className="mdetail-dialogue-list">
            {filteredDialogue.length > 0 ? (
              filteredDialogue.map((turn, idx) => (
                <div
                  key={idx}
                  className={`mdetail-dialogue-turn ${
                    turn.isCommitment
                      ? 'highlighted-commitment'
                      : turn.tag === 'Decision'
                      ? 'highlighted-decision'
                      : ''
                  }`}
                >
                  <div className={`mdetail-speaker-avatar ${turn.avatarColor}`}>
                    {turn.initials}
                  </div>

                  <div className="mdetail-speech-content">
                    <div className="mdetail-speaker-header">
                      <span className="mdetail-speaker-name">{turn.speaker}</span>
                      <span className="mdetail-timestamp">{turn.time}</span>
                      {turn.tag && (
                        <span className={turn.tagClass}>
                          {turn.tag}
                        </span>
                      )}
                    </div>
                    <p className="mdetail-speech-text">{turn.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A3ACC0', fontSize: '14px' }}>
                {transcript?.raw_text
                  ? 'No speech turns matched your search query.'
                  : 'No transcript recorded yet for this meeting. It will appear here once the call completes.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Intelligence & Summaries */}
        <div className="mdetail-summary-card">
          {/* Card Tabs: Summary | Tasks N | Ask AI */}
          <div className="mdetail-card-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`mdetail-card-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`mdetail-card-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            >
              Tasks {actionItems.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ask')}
              className={`mdetail-card-tab-btn ${activeTab === 'ask' ? 'active' : ''}`}
            >
              Ask AI
            </button>
          </div>

          {/* Tab 1: Summary Content */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {summary ? (
                <>
                  {/* Overview */}
                  <div className="mdetail-overview-block">
                    <h3 className="mdetail-section-subhead">Overview</h3>
                    <p className="mdetail-overview-text">{summary.executive_summary || 'No overview available.'}</p>
                    {summary.model_version && (
                      <span className="mdetail-model-tag">Summarized by {summary.model_version}</span>
                    )}
                  </div>

                  {/* Decisions */}
                  {summary.decisions && summary.decisions.length > 0 && (
                    <div className="mdetail-decisions-block">
                      <h3 className="mdetail-section-subhead">Decisions {summary.decisions.length}</h3>
                      {summary.decisions.map((dec, i) => (
                        <div key={i} className="mdetail-decision-card">
                          <CheckCircle2 size={16} className="mdetail-decision-check" />
                          <p className="mdetail-decision-text">{dec}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Discussion Points Accordion */}
                  {summary.discussion_points && summary.discussion_points.length > 0 && (
                    <div className="mdetail-discussions-block">
                      <h3 className="mdetail-section-subhead">Discussion points</h3>
                      {summary.discussion_points.map((dp, i) => {
                        const isExpanded = !!expandedTopics[dp.topic];
                        return (
                          <div key={i} className="mdetail-accordion-card">
                            <button
                              type="button"
                              onClick={() => toggleTopic(dp.topic)}
                              className="mdetail-accordion-header"
                            >
                              <span>{dp.topic}</span>
                              {isExpanded ? <ChevronUp size={15} color="#94A3B8" /> : <ChevronDown size={15} color="#64748B" />}
                            </button>
                            {isExpanded && (
                              <p className="mdetail-accordion-body">{dp.summary}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#A3ACC0', fontSize: '14px' }}>
                  No executive summary has been generated for this meeting yet.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Tasks Content */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="mdetail-section-subhead">Extracted Commitments</h3>
                <span style={{ fontSize: '0.75rem', color: '#10B981' }}>
                  {syncedTasksCount} of {actionItems.length} Synced
                </span>
              </div>

              {actionItems.length > 0 ? (
                actionItems.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: '#0E121A',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>{task.title}</span>
                      {task.jira_issue_key ? (
                        <a
                          href={task.jira_issue_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.7rem',
                            background: 'rgba(37, 99, 235, 0.15)',
                            color: '#60A5FA',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                        >
                          <span>{task.jira_issue_key}</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePushSingleTask(task.id)}
                          style={{
                            fontSize: '0.7rem',
                            background: '#1E2536',
                            color: '#94A3B8',
                            border: '1px solid #2D3748',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Push to Jira
                        </button>
                      )}
                    </div>
                    {task.description && (
                      <p style={{ fontSize: '0.775rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#64748B' }}>
                      <span>Assignee: <strong style={{ color: '#CBD5E1' }}>{task.assignee_name || 'Unassigned'}</strong></span>
                      <span>Priority: <strong style={{ color: '#CBD5E1', textTransform: 'capitalize' }}>{task.priority}</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#A3ACC0', fontSize: '14px' }}>
                  No action items extracted for this meeting yet.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Ask AI */}
          {activeTab === 'ask' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#60A5FA" />
                <h3 className="mdetail-section-subhead">Ask AI About This Meeting</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                Query the verbatim audio transcript. Gemini analyzes dialogue context with citations.
              </p>

              {aiAnswers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                  {aiAnswers.map((pair, idx) => (
                    <div key={idx} style={{ background: '#0E121A', padding: '12px', borderRadius: '10px', fontSize: '0.825rem' }}>
                      <div style={{ fontWeight: 600, color: '#60A5FA', marginBottom: '4px' }}>Q: {pair.q}</div>
                      <div style={{ color: '#E2E8F0', lineHeight: 1.5 }}>{pair.a}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAskAi} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <input
                  type="text"
                  placeholder="Ask a question about this meeting..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="mdetail-search-input"
                  style={{ paddingLeft: '14px' }}
                />
                <button
                  type="submit"
                  disabled={askingAi || !userQuery.trim()}
                  className="dash-btn-primary"
                  style={{ padding: '8px 14px', borderRadius: '10px' }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
