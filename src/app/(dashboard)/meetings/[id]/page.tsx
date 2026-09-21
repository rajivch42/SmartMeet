'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Meeting, Transcript, Summary, ActionItem } from '@/types/database';
import Link from 'next/link';
import {
  ArrowLeft,
  Video,
  Clock,
  Users,
  Bot,
  FileText,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  MessageSquare,
  PlayCircle,
  AlertCircle,
  Calendar,
  Layers,
  Send,
  CheckSquare,
  ArrowUpRight,
  Quote,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: {
    speaker: string;
    timestamp: string;
    text: string;
  }[];
}

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [dispatching, setDispatching] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [postingSlack, setPostingSlack] = useState(false);
  const [syncingJira, setSyncingJira] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'tasks' | 'qa'>('summary');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Transcript Search Filter
  const [transcriptSearch, setTranscriptSearch] = useState('');
  // Discussion points accordion toggle
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({ 0: true });

  // Q&A Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I have indexed the diarized dialogue from this meeting. You can ask me any question about decisions, task owners, or technical discussions.',
    },
  ]);
  const [queryInput, setQueryInput] = useState('');
  const [askingQA, setAskingQA] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchMeetingDetail = useCallback(async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await fetch(`/api/meetings/${meetingId}`);
      const json = await res.json();
      if (json.success) {
        setMeeting(json.data.meeting);
        setTranscript(json.data.transcript);
        setSummary(json.data.summary);
        setActionItems(json.data.action_items || []);
      } else {
        setErrorState(json.error?.message || 'Failed to load meeting details.');
      }
    } catch {
      setErrorState('Network error loading meeting details. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchMeetingDetail();
  }, [fetchMeetingDetail]);

  useEffect(() => {
    if (!transcript?.raw_text || suggestedQuestions.length > 0) return;
    let isMounted = true;
    setLoadingSuggestions(true);
    fetch(`/api/qa/suggestions?meeting_id=${meetingId}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && Array.isArray(json.data)) {
          setSuggestedQuestions(json.data);
        }
      })
      .catch((err) => console.warn('Error fetching suggested questions:', err))
      .finally(() => {
        if (isMounted) setLoadingSuggestions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [transcript?.raw_text, meetingId, suggestedQuestions.length]);

  useEffect(() => {
    if (activeTab === 'qa') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const [syncingBot, setSyncingBot] = useState(false);

  const handleDispatchBot = async () => {
    try {
      setDispatching(true);
      setStatusMessage(null);
      const res = await fetch('/api/bot/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, simulate_complete: false }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: 'success',
          text: json.data?.message || 'Recall bot successfully dispatched to Google Meet.',
        });
        await fetchMeetingDetail();
      } else {
        setStatusMessage({
          type: 'error',
          text: json.error?.message || 'Failed to dispatch bot.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error dispatching bot.' });
    } finally {
      setDispatching(false);
    }
  };

  const handleSyncBot = async () => {
    try {
      setSyncingBot(true);
      setStatusMessage(null);
      const res = await fetch('/api/bot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: 'success',
          text: json.data?.message || 'Bot status and audio stream updated.',
        });
        await fetchMeetingDetail();
      } else {
        setStatusMessage({
          type: 'error',
          text: json.error?.message || 'Failed to sync bot transcript.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error syncing bot transcript.' });
    } finally {
      setSyncingBot(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setSummarizing(true);
      setStatusMessage(null);
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: 'success',
          text: 'AI summary and action items extracted successfully with Gemini 2.5 Flash.',
        });
        await fetchMeetingDetail();
        setActiveTab('summary');
      } else {
        setStatusMessage({
          type: 'error',
          text: json.error?.message || 'Summary generation failed. Check recording length or API keys.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error generating AI summary.' });
    } finally {
      setSummarizing(false);
    }
  };

  const handlePostToSlack = async () => {
    try {
      setPostingSlack(true);
      setStatusMessage(null);
      const res = await fetch('/api/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: 'success',
          text: `Meeting summary broadcasted to ${json.data?.channel || '#meeting-summaries'} on Slack`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: json.error?.message || 'Failed to post meeting summary to Slack.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error posting to Slack.' });
    } finally {
      setPostingSlack(false);
    }
  };

  const handleSyncToJira = async (actionItemId?: string) => {
    try {
      if (actionItemId) setSyncingItemId(actionItemId);
      else setSyncingJira(true);
      setStatusMessage(null);

      const res = await fetch('/api/integrations/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          action_item_id: actionItemId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const firstKey = json.data && json.data[0]?.jira_issue_key;
        setStatusMessage({
          type: 'success',
          text: firstKey
            ? `Jira issue ${firstKey} created successfully`
            : `Successfully created ${json.count} Jira issue(s)`,
        });
        await fetchMeetingDetail();
      } else {
        setStatusMessage({
          type: 'error',
          text: json.error?.message || 'Failed to push issues to Jira Cloud.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error communicating with Jira.' });
    } finally {
      setSyncingJira(false);
      setSyncingItemId(null);
    }
  };

  const handleSendQuestion = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || queryInput.trim();
    if (!query || askingQA) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetQuery) setQueryInput('');
    setAskingQA(true);

    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          query,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: json.data?.answer || 'Answer synthesized from transcript dialogue.',
          citations: json.data?.citations,
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: `Unable to synthesize answer: ${json.error?.message || 'Transcript slice error.'}`,
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Network error communicating with the semantic Q&A service.',
        },
      ]);
    } finally {
      setAskingQA(false);
    }
  };

  const scrollToTranscriptTime = (timestamp: string) => {
    const id = `line-${timestamp.replace(':', '-')}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.backgroundColor = 'var(--bg-elevated)';
      setTimeout(() => {
        el.style.backgroundColor = 'var(--bg-base)';
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="card skeleton-shimmer" style={{ height: '70px' }} />
        <div className="dual-pane-grid">
          <div className="card skeleton-shimmer" style={{ height: '560px' }} />
          <div className="card skeleton-shimmer" style={{ height: '560px' }} />
        </div>
      </div>
    );
  }

  if (errorState || !meeting) {
    return (
      <div
        className="card-large-surface"
        style={{
          padding: 'var(--space-10) var(--space-6)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <AlertCircle size={44} color="var(--status-danger)" />
        <h2 className="type-h2">Meeting Not Found or Unavailable</h2>
        <p className="prose-limit" style={{ color: 'var(--text-secondary)' }}>
          {errorState || 'The requested meeting ID could not be located in your synchronized workspace.'}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button onClick={fetchMeetingDetail} className="btn btn-secondary">
            <RefreshCw size={14} /> Retry
          </button>
          <Link href="/meetings" className="btn btn-primary">
            <ArrowLeft size={14} /> Back to Meetings
          </Link>
        </div>
      </div>
    );
  }

  const parseTranscriptLines = (text: string) => {
    return text.split('\n').filter((line) => line.trim().length > 0);
  };

  const filteredTranscriptLines = transcript?.raw_text
    ? parseTranscriptLines(transcript.raw_text).filter((line) =>
        transcriptSearch ? line.toLowerCase().includes(transcriptSearch.toLowerCase()) : true
      )
    : [];

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header Bar: Breadcrumb, date/duration tag, status badge, export actions */}
      <div>
        <Link
          href="/meetings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            marginBottom: 'var(--space-2)',
          }}
        >
          <ArrowLeft size={14} /> Meetings / {meeting.title}
        </Link>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
              <h1 className="type-h1 gradient-text-hero">{meeting.title}</h1>
              <span
                className={`badge ${
                  meeting.status === 'summarized'
                    ? 'badge-resolved'
                    : meeting.status === 'in_progress' || meeting.status === 'bot_dispatched'
                    ? 'badge-live'
                    : 'badge-warning'
                }`}
              >
                {meeting.status === 'summarized' ? (
                  <>
                    <span className="node-gold-dot" style={{ width: '6px', height: '6px' }} />
                    Resolved
                  </>
                ) : meeting.status === 'in_progress' || meeting.status === 'bot_dispatched' ? (
                  <>
                    <span className="node-pulse-dot" />
                    In Call
                  </>
                ) : (
                  <>
                    <span className="status-dot-solid" style={{ background: 'var(--status-warning)' }} />
                    Scheduled
                  </>
                )}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <Clock size={14} className="icon-hover-rotate" color="var(--primary)" />
                {new Date(meeting.start_time).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>

              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--primary)' }}
              >
                <Video size={14} color="var(--status-success)" /> Open Google Meet <ExternalLink size={11} className="icon-hover-arrow" />
              </a>

              {meeting.attendees && meeting.attendees.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Users size={14} className="icon-hover-rotate" /> {meeting.attendees.length} Attendees
                </span>
              )}
            </div>
          </div>

          {/* Export Actions & Pipeline Triggers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {!transcript ? (
              meeting.status === 'bot_dispatched' || meeting.status === 'in_progress' ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    onClick={handleSyncBot}
                    disabled={syncingBot}
                    className="btn btn-primary"
                  >
                    <RefreshCw size={14} className={syncingBot ? 'status-dot-pulse' : ''} />
                    {syncingBot ? 'Checking Recall.ai...' : 'Fetch Transcript'}
                  </button>
                  <button
                    onClick={handleDispatchBot}
                    disabled={dispatching}
                    className="btn btn-secondary btn-sm"
                  >
                    <Bot size={14} /> Dispatch Bot Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDispatchBot}
                  disabled={dispatching}
                  className="btn btn-primary"
                >
                  <Bot size={15} />
                  {dispatching ? 'Dispatching...' : 'Dispatch Bot'}
                </button>
              )
            ) : !summary ? (
              <button
                onClick={handleGenerateSummary}
                disabled={summarizing}
                className="btn btn-primary"
              >
                <Sparkles size={15} />
                {summarizing ? 'Synthesizing...' : 'Generate AI Summary'}
              </button>
            ) : (
              <>
                <button
                  onClick={handlePostToSlack}
                  disabled={postingSlack}
                  className="btn btn-secondary btn-sm"
                >
                  <span className="badge-slack" style={{ padding: '2px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>
                    Slack
                  </span>
                  {postingSlack ? 'Posting...' : 'Post to Slack'}
                </button>

                <button
                  onClick={() => handleSyncToJira()}
                  disabled={syncingJira}
                  className="btn btn-primary btn-sm"
                >
                  <span className="badge-jira" style={{ padding: '2px 5px', borderRadius: '4px', fontSize: '0.7rem', color: '#ffffff' }}>
                    Jira
                  </span>
                  {syncingJira ? 'Creating Tickets...' : 'Push All to Jira'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`badge ${statusMessage.type === 'success' ? 'badge-success' : 'badge-danger'}`}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            lineHeight: 1.4,
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Dual-Pane Layout (--radius-lg surfaces, stacks vertically at <1024px) */}
      <div className="dual-pane-grid">
        {/* LEFT PANE: Diarized Transcript (--radius-lg) */}
        <div
          className="card-large-surface"
          style={{
            minHeight: '620px',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-5)',
          }}
        >
          {/* Header & Keyword Search */}
          <div
            style={{
              paddingBottom: 'var(--space-4)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="icon-container-cyan" style={{ width: '32px', height: '32px' }}>
                  <FileText size={16} />
                </div>
                <h2 className="type-h2">Diarized Transcript</h2>
              </div>
              {transcript && (
                <span className="type-caption" style={{ color: 'var(--text-muted)' }}>
                  Duration: {Math.round(transcript.duration_seconds)}s
                </span>
              )}
            </div>

            {/* Keyword search input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder="Search dialogue phrases or speaker..."
                className="input-field"
                style={{ paddingLeft: '2.2rem', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Transcript Dialogue Scrollable Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 'var(--space-4) 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              maxHeight: '520px',
            }}
          >
            {!transcript ? (
              <div style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bot size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.5, display: 'block' }} />
                <h3 className="type-h3" style={{ marginBottom: 'var(--space-1)' }}>No Transcript Recorded Yet</h3>
                <p className="prose-limit" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 auto var(--space-4)' }}>
                  Dispatch the Recall bot to capture speaker audio and generate real-time timestamps.
                </p>
                <button onClick={handleDispatchBot} disabled={dispatching} className="btn btn-primary btn-sm">
                  <PlayCircle size={14} /> Dispatch Bot Now
                </button>
              </div>
            ) : filteredTranscriptLines.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No dialogue matched &ldquo;{transcriptSearch}&rdquo;.
              </div>
            ) : (
              filteredTranscriptLines.map((line, idx) => {
                const match = line.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
                if (match) {
                  const [, timestamp, speaker, text] = match;
                  const isActionItemPhrase =
                    text.toLowerCase().includes('will ') ||
                    text.toLowerCase().includes('script') ||
                    text.toLowerCase().includes('migrate') ||
                    text.toLowerCase().includes('friday') ||
                    text.toLowerCase().includes('by ');

                  return (
                    <div
                      key={idx}
                      id={`line-${timestamp.replace(':', '-')}`}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-base)',
                        border: isActionItemPhrase
                          ? '1px solid rgba(99, 102, 241, 0.35)'
                          : '1px solid var(--border-subtle)',
                        transition: 'background-color 0.3s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {speaker}
                        </span>
                        <button
                          type="button"
                          onClick={() => scrollToTranscriptTime(timestamp)}
                          className="type-caption"
                          title="Seek to timestamp"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            color: 'var(--cyan)',
                            background: 'var(--bg-card)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          [{timestamp}]
                        </button>
                        {isActionItemPhrase && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                          >
                            Commitment
                          </span>
                        )}
                      </div>
                      <p className="type-body-medium" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {text}
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: AI Intelligence Panel (--radius-lg) */}
        <div
          className="card-large-surface"
          style={{
            minHeight: '620px',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-5)',
          }}
        >
          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              gap: 'var(--space-2)',
              paddingBottom: 'var(--space-3)',
            }}
          >
            <button
              onClick={() => setActiveTab('summary')}
              className={`btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Sparkles size={14} className="icon-hover-rotate" /> Summary {summary ? `(${summary.decisions.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <CheckCircle2 size={14} className="icon-hover-zoom" /> Tasks ({actionItems.length})
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`btn btn-sm ${activeTab === 'qa' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <MessageSquare size={14} className="icon-hover-bounce" /> Ask AI (Q&amp;A)
            </button>
          </div>

          <div style={{ flex: 1, padding: 'var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* TAB 1: Structured Summary */}
            {activeTab === 'summary' && (
              <>
                {!summary ? (
                  <div style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Sparkles size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.5, display: 'block' }} />
                    <h3 className="type-h3" style={{ marginBottom: 'var(--space-1)' }}>No AI Summary Available</h3>
                    <p className="prose-limit" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 auto var(--space-4)' }}>
                      {transcript
                        ? 'Transcript is recorded. Click below to synthesize structured decisions and action items.'
                        : 'Record a meeting transcript first to run the AI synthesis pipeline.'}
                    </p>
                    {transcript && (
                      <button onClick={handleGenerateSummary} disabled={summarizing} className="btn btn-primary btn-sm">
                        <Sparkles size={14} /> Generate AI Summary
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    {/* Executive Overview (Strictly max-width 65ch per Spec) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        <Sparkles size={16} color="var(--primary)" />
                        <h3 className="type-h3">Executive Overview</h3>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {summary.model_version || 'Gemini 2.5 Flash'}
                        </span>
                      </div>
                      <div
                        className="prose-limit"
                        style={{
                          padding: 'var(--space-4)',
                          background: 'var(--bg-base)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.875rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.6,
                        }}
                      >
                        {summary.executive_summary}
                      </div>
                    </div>

                    {/* Key Decisions Made (Gold Resolved Cards per Spec) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        <span className="node-gold-dot" style={{ width: '8px', height: '8px' }} />
                        <h3 className="type-h3" style={{ color: 'var(--text-primary)' }}>Decisions Made ({summary.decisions.length})</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {summary.decisions.map((decision, dIdx) => (
                          <div
                            key={dIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 'var(--space-3)',
                              padding: 'var(--space-3) var(--space-4)',
                              background: 'var(--status-resolved-bg)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(242, 185, 77, 0.25)',
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <span className="node-gold-dot" style={{ flexShrink: 0, marginTop: '5px', width: '6px', height: '6px' }} />
                            <span style={{ lineHeight: 1.5 }}>{decision}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Discussion Points (Collapsible Accordions by Topic per Spec) */}
                    {summary.discussion_points && summary.discussion_points.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                          <Layers size={16} color="var(--accent-cyan)" />
                          <h3 className="type-h3">Discussion Points</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {summary.discussion_points.map((dp, pIdx) => {
                            const isExpanded = !!expandedTopics[pIdx];
                            return (
                              <div
                                key={pIdx}
                                style={{
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-base)',
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTopics((prev) => ({ ...prev, [pIdx]: !prev[pIdx] }))
                                  }
                                  style={{
                                    width: '100%',
                                    padding: 'var(--space-3) var(--space-4)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    textAlign: 'left',
                                    background: 'var(--bg-base)',
                                  }}
                                >
                                  <strong style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                                    {dp.topic}
                                  </strong>
                                  {isExpanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                                </button>
                                {isExpanded && (
                                  <div
                                    className="prose-limit"
                                    style={{
                                      padding: '0 var(--space-4) var(--space-3)',
                                      fontSize: '0.825rem',
                                      color: 'var(--text-secondary)',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {dp.summary}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: Action Items & Jira Sync */}
            {activeTab === 'tasks' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <h3 className="type-h3">Extracted Action Items ({actionItems.length})</h3>
                  {actionItems.some((a) => a.status !== 'synced_to_jira') && (
                    <button
                      onClick={() => handleSyncToJira()}
                      disabled={syncingJira}
                      className="btn btn-primary btn-sm"
                    >
                      <ArrowUpRight size={13} />
                      {syncingJira ? 'Creating Tickets...' : 'Push All to Jira'}
                    </button>
                  )}
                </div>

                {actionItems.length === 0 ? (
                  <div style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.85rem' }}>No action items extracted yet. Generate an AI summary first.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {actionItems.map((item) => {
                      const isSynced = item.status === 'synced_to_jira' && item.jira_issue_key;
                      const isSyncingThis = syncingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="card"
                          style={{
                            padding: 'var(--space-4)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-2)',
                            borderRadius: 'var(--radius-md)',
                            border: isSynced ? '1px solid rgba(242, 185, 77, 0.25)' : '1px solid var(--border-default)',
                            background: isSynced ? 'linear-gradient(180deg, rgba(242, 185, 77, 0.03) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                              {isSynced ? (
                                <span className="node-gold-dot" title="Synced to Jira" />
                              ) : (
                                <span
                                  style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    border: '1.5px solid var(--border-default)',
                                    display: 'inline-block',
                                    flexShrink: 0,
                                  }}
                                  title="Pending Jira sync"
                                />
                              )}
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.title}</strong>
                              <span
                                className={`badge ${
                                  item.priority === 'high'
                                    ? 'badge-warning'
                                    : 'badge-secondary'
                                }`}
                                style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                              >
                                {item.priority}
                              </span>
                            </div>

                            {/* Jira Button or Semantic Badge */}
                            <div>
                              {isSynced ? (
                                <a
                                  href={item.jira_issue_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="badge-resolved"
                                  style={{
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono, monospace)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    textDecoration: 'none',
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>Jira</span>
                                  <span>{item.jira_issue_key}</span>
                                  <ExternalLink size={10} color="var(--gold)" />
                                </a>
                              ) : (
                                <button
                                  onClick={() => handleSyncToJira(item.id)}
                                  disabled={isSyncingThis}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  <span className={isSyncingThis ? 'node-pulse-dot' : ''} />
                                  <ArrowUpRight size={12} />
                                  {isSyncingThis ? 'Creating...' : 'Push to Jira'}
                                </button>
                              )}
                            </div>
                          </div>

                          {item.description && (
                            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 'var(--space-1) 0' }}>
                              {item.description}
                            </p>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 'var(--space-2)',
                              paddingTop: 'var(--space-2)',
                              borderTop: '1px solid var(--border-subtle)',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                              <Users size={13} color="var(--blue)" />
                              <strong>{item.assignee_name || 'Unassigned'}</strong>
                              {item.assignee_email && ` (${item.assignee_email})`}
                            </span>

                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                              <Calendar size={13} color="var(--status-warning)" />
                              Due: {formatDueDate(item.due_date)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Conversational Q&A Over This Transcript */}
            {activeTab === 'qa' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: '440px' }}>
                {/* Chat Message Stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 'var(--space-3)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-3)',
                    maxHeight: '380px',
                  }}
                >
                  {chatMessages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isUser ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          className={!isUser ? 'prose-limit' : ''}
                          style={{
                            maxWidth: isUser ? '80%' : '100%',
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            background: isUser ? 'var(--blue)' : 'var(--bg-card)',
                            color: isUser ? '#ffffff' : 'var(--text-primary)',
                            fontSize: '0.875rem',
                            lineHeight: 1.55,
                            border: isUser ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-default)',
                            boxShadow: isUser
                              ? '0 4px 14px rgba(62, 142, 247, 0.25)'
                              : 'var(--shadow-sm)',
                          }}
                        >
                          {msg.text}
                        </div>

                        {/* Citations as Clickable Timestamp Pills (Cyan Energy Palette) */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div
                            style={{
                              marginTop: 'var(--space-2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-1)',
                            }}
                          >
                            <span className="type-caption" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                              Source Dialogue Citations:
                            </span>
                            {msg.citations.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => scrollToTranscriptTime(c.timestamp)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: 'var(--space-2) var(--space-3)',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--cyan-bg)',
                                  border: '1px solid rgba(95, 231, 242, 0.28)',
                                  color: 'var(--cyan)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-2)',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.18s var(--ease-standard)',
                                }}
                              >
                                <Quote size={12} color="var(--cyan)" />
                                <span>
                                  <strong style={{ color: 'var(--cyan)' }}>[{c.timestamp}] {c.speaker}:</strong>{' '}
                                  <span style={{ color: 'var(--text-secondary)' }}>&ldquo;{c.text.slice(0, 75)}...&rdquo;</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {askingQA && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span className="status-dot-pulse" />
                      Synthesizing answer from transcript chunks...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Questions Grounded in Transcript */}
                {(suggestedQuestions.length > 0 || loadingSuggestions) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                    <span className="type-caption" style={{ color: 'var(--text-muted)', marginRight: '4px' }}>
                      Suggested:
                    </span>
                    {loadingSuggestions && (
                      <span className="type-caption" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Analyzing dialogue...
                      </span>
                    )}
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuestion(undefined, q)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input form */}
                <form onSubmit={handleSendQuestion} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="Ask any question about this meeting..."
                    className="input-field"
                    disabled={askingQA}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" disabled={askingQA || !queryInput.trim()} className="btn btn-primary">
                    <Send size={15} className="icon-hover-arrow" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
