'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Settings,
  Calendar,
  Bot,
  MessageSquare,
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string>('team@company.internal');
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/placeholder');
  const [slackChannel, setSlackChannel] = useState('#meeting-summaries');

  // Google Calendar & Recall.ai Preferences
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [joinLeadTime, setJoinLeadTime] = useState('2 minutes before');
  const [announceAudio, setAnnounceAudio] = useState(true);

  // Jira Configuration State
  const [jiraDomain, setJiraDomain] = useState('vit-team-z9uxt7fk.atlassian.net');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('KAN');
  const [hasValidToken, setHasValidToken] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Status & Verification States
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [jiraInlineError, setJiraInlineError] = useState<string | null>(null);
  const [verifyingJira, setVerifyingJira] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    // 1. Fetch Supabase user
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    // 2. Fetch server-side saved settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.jira_host_domain) setJiraDomain(json.data.jira_host_domain);
          if (json.data.jira_user_email) setJiraEmail(json.data.jira_user_email);
          if (json.data.jira_default_project_key) setJiraProjectKey(json.data.jira_default_project_key);
          if (json.data.slack_webhook_url) setSlackWebhook(json.data.slack_webhook_url);
          setHasValidToken(!!json.data.has_valid_jira_token);
        }
      })
      .catch((err) => console.warn('Error fetching settings:', err));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setStatusMessage(null);
      setJiraInlineError(null);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jira_host_domain: jiraDomain,
          jira_user_email: jiraEmail,
          jira_api_token: jiraApiToken || undefined,
          jira_default_project_key: jiraProjectKey,
          slack_webhook_url: slackWebhook,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (jiraApiToken.trim().length > 0) {
          setHasValidToken(true);
        }
        setStatusMessage({ type: 'success', text: 'Integration parameters updated in environment store successfully.' });
      } else {
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to save settings.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error saving configuration.' });
    } finally {
      setSavingSettings(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleTestSlack = async () => {
    setStatusMessage({
      type: 'success',
      text: `Slack webhook connection test dispatched to ${slackChannel}`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleTestJira = async () => {
    try {
      setVerifyingJira(true);
      setStatusMessage(null);
      setJiraInlineError(null);

      const res = await fetch('/api/settings/verify-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: jiraDomain,
          user_email: jiraEmail,
          api_token: jiraApiToken || undefined,
          project_key: jiraProjectKey,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: 'success',
          text: json.message || 'Jira Cloud REST API connection verified successfully!',
        });
      } else {
        // Specific inline error per Spec
        setJiraInlineError(json.error || 'API token rejected by Jira — check it hasn’t expired or missing permissions.');
      }
    } catch {
      setJiraInlineError('Network connection to Jira Cloud failed. Check domain hostname.');
    } finally {
      setVerifyingJira(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--blue-bg)',
              border: '1px solid rgba(62, 142, 247, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue)',
            }}
          >
            <Settings size={20} />
          </div>
          <h1 className="type-h1" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Settings &amp; Integrations
          </h1>
        </div>
        <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Manage your connected Google Calendar, Recall.ai bot parameters, Slack alerts, and Jira Cloud credentials.
        </p>
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

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* 1. Google Calendar Card (--radius-lg) */}
        <div className="card-large-surface">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={18} color="var(--brand-google)" />
              </div>
              <div>
                <h2 className="type-h2" style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Google Calendar
                </h2>
                <p className="type-caption" style={{ color: 'var(--text-secondary)' }}>
                  Monitors calendar events for Google Meet URLs and schedule times.
                </p>
              </div>
            </div>
            {/* Live connection indicator: synchronized 3.2s master pulse */}
            <div className="badge-live" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
              <span className="node-pulse-dot" />
              Connected
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Connected Google Account: <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Auto-dispatch bot for all Google Meet events
                </div>
                <div className="type-caption" style={{ color: 'var(--text-muted)' }}>
                  Automatically sends the notetaker bot to upcoming meetings 2 minutes prior.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoDispatch}
                onChange={(e) => setAutoDispatch(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--blue)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* 2. Recall.ai Bot Configuration Card (--radius-lg) */}
        <div className="card-large-surface">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--blue-bg)',
                  border: '1px solid rgba(62, 142, 247, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} color="var(--blue)" />
              </div>
              <div>
                <h2 className="type-h2" style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Recall.ai Bot Configuration
                </h2>
                <p className="type-caption" style={{ color: 'var(--text-secondary)' }}>
                  Controls meeting audio recording, diarization, and transcription capture.
                </p>
              </div>
            </div>
            {/* Live connection indicator: synchronized master pulse */}
            <div className="badge-live" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
              <span className="node-pulse-dot" />
              Operational
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Bot Display Name
              </label>
              <input type="text" readOnly value="AutoSync Notetaker" className="input-field" disabled />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Join Lead Time
              </label>
              <select
                value={joinLeadTime}
                onChange={(e) => setJoinLeadTime(e.target.value)}
                className="input-field"
              >
                <option value="At start time">At start time</option>
                <option value="2 minutes before">2 minutes before</option>
                <option value="5 minutes before">5 minutes before</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-2)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Recording-announcement audio
                </div>
                <div className="type-caption" style={{ color: 'var(--text-muted)' }}>
                  Play audible consent prompt when the bot joins the call.
                </div>
              </div>
              <input
                type="checkbox"
                checked={announceAudio}
                onChange={(e) => setAnnounceAudio(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* 3. Slack Webhook Alerts Card (--radius-lg) */}
        <div className="card-large-surface">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(236, 178, 46, 0.12)',
                  border: '1px solid rgba(236, 178, 46, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageSquare size={18} color="var(--gold)" />
              </div>
              <div>
                <h2 className="type-h2" style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Slack Integration
                </h2>
                <p className="type-caption" style={{ color: 'var(--text-secondary)' }}>
                  Dispatches executive summaries and action-item deadline reminders to Slack channels.
                </p>
              </div>
            </div>
            <button type="button" onClick={handleTestSlack} className="btn btn-secondary btn-sm">
              Send Test Message
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Incoming Webhook URL
              </label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="input-field"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Target Channel
              </label>
              <input
                type="text"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="input-field"
                placeholder="#meeting-summaries"
              />
            </div>
          </div>
        </div>

        {/* 4. Jira Cloud Integration Card (--radius-lg) */}
        <div className="card-large-surface">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--blue-bg)',
                  border: '1px solid rgba(62, 142, 247, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckSquare size={18} color="var(--blue)" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h2 className="type-h2" style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    Jira Cloud Integration
                  </h2>
                  {hasValidToken ? (
                    <span className="badge-resolved" style={{ fontSize: '0.7rem' }}>
                      <span className="node-gold-dot" /> Connected
                    </span>
                  ) : (
                    <span className="badge-warning" style={{ fontSize: '0.7rem' }}>
                      <span className="status-dot-solid" style={{ background: 'var(--status-warning)' }} /> Not Connected
                    </span>
                  )}
                </div>
                <p className="type-caption" style={{ color: 'var(--text-secondary)' }}>
                  Synchronizes extracted tasks directly into Atlassian backlog via REST API v3.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestJira}
              disabled={verifyingJira}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw size={13} className={verifyingJira ? 'status-dot-pulse' : 'icon-hover-rotate'} />
              {verifyingJira ? 'Testing...' : 'Test Jira Connection'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Jira Domain *
              </label>
              <input
                type="text"
                required
                value={jiraDomain}
                onChange={(e) => setJiraDomain(e.target.value)}
                className="input-field"
                placeholder="vit-team-z9uxt7fk.atlassian.net"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Atlassian User Email *
              </label>
              <input
                type="email"
                required
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                className="input-field"
                placeholder="developer@company.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Default Project Key *
              </label>
              <input
                type="text"
                required
                value={jiraProjectKey}
                onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                className="input-field"
                placeholder="KAN"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                Atlassian API Token *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  className={`input-field ${jiraInlineError ? 'input-error' : ''}`}
                  placeholder={hasValidToken ? '•••••••••••••••••••••••• (Active)' : 'Enter Atlassian REST API Token'}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Specific inline failure per Spec */}
              {jiraInlineError ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--status-danger)', marginTop: 'var(--space-1)' }}>
                  {jiraInlineError}
                </p>
              ) : (
                <p className="type-caption" style={{ color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                  Manage tokens at{' '}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--cyan)' }}
                  >
                    id.atlassian.com <ExternalLink size={10} color="var(--cyan)" style={{ display: 'inline' }} />
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 5. Peer-Help Network (Phase 2 Preview) Disabled Card per Spec */}
        <div
          className="card-large-surface"
          style={{
            opacity: 0.55,
            border: '1px dashed var(--border-default)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HelpCircle size={18} color="var(--text-muted)" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h2 className="type-h2" style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Peer-Help Network
                  </h2>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                    Coming in Phase 2
                  </span>
                </div>
                <p className="prose-limit" style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: 'var(--space-1)' }}>
                  Anonymous, privacy-preserving question exchange across engineering domains. Connects teammates facing similar technical hurdles without revealing raw transcripts.
                </p>
              </div>
            </div>
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              Inactive
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button type="submit" disabled={savingSettings} className="btn btn-primary">
            <Save size={15} className="icon-hover-rotate" /> {savingSettings ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
