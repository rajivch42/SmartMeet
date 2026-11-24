import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Eye, Calendar, Database, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - AutoSync Meet',
  description: 'Privacy Policy for AutoSync Meet AI Meeting Assistant Platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, rgba(62, 142, 247, 0.08) 0%, #08090B 70%)',
        color: 'var(--text-primary)',
        padding: '2.5rem 1.5rem',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        {/* Navigation Back */}
        <div>
          <Link
            href="/login"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>

        {/* Header */}
        <div
          className="card"
          style={{
            padding: '2.5rem 2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--blue-bg)',
                border: '1px solid rgba(62, 142, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue)',
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h1 className="type-h1" style={{ fontSize: '1.75rem', margin: 0 }}>
                Privacy Policy
              </h1>
              <span className="type-caption" style={{ color: 'var(--text-muted)' }}>
                Effective Date: November 24, 2026 • AutoSync Meet Platform
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            AutoSync Meet (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Application&rdquo;) is committed to protecting your privacy. This Privacy Policy details how we access, collect, use, and safeguard your data when using our autonomous meeting intelligence and task management platform.
          </p>
        </div>

        {/* Section 1: Google API Scopes & Calendar Data */}
        <div
          className="card"
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--blue)" />
            <h2 className="type-h2" style={{ fontSize: '1.25rem', margin: 0 }}>
              1. Google User Data &amp; Calendar Scopes
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            When you authenticate via Google Sign-In, we request read-only access to your calendar events via the scope:
          </p>
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
            }}
          >
            https://www.googleapis.com/auth/calendar.readonly
          </div>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
            <li><strong>How we use it:</strong> We read calendar event metadata (title, start/end times, attendee emails, and Google Meet video links) solely to identify scheduled calls and coordinate bot attendance.</li>
            <li><strong>What we do NOT do:</strong> We do not modify, create, or delete calendar events. We do not sell or share your calendar information with third-party advertisers.</li>
            <li><strong>Google API Limited Use Disclosure:</strong> AutoSync Meet&apos;s use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
          </ul>
        </div>

        {/* Section 2: Meeting Transcripts & Intelligence */}
        <div
          className="card"
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} color="var(--accent-cyan)" />
            <h2 className="type-h2" style={{ fontSize: '1.25rem', margin: 0 }}>
              2. Meeting Recordings &amp; Dialogue Processing
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            When an authorized recording bot joins a Google Meet session:
          </p>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
            <li>Audio streams are processed by our recording infrastructure (Recall.ai) to transcribe verbal discussions with speaker diarization.</li>
            <li>Transcripts are analyzed using large language models (Google Gemini) exclusively to extract key decisions, summaries, and action items for your team.</li>
            <li>Audio transcripts and summaries are stored securely in your dedicated Supabase database protected by PostgreSQL Row-Level Security (RLS).</li>
            <li>Your meeting transcripts are <strong>never used to train foundational AI models</strong>.</li>
          </ul>
        </div>

        {/* Section 3: Third-Party Integrations */}
        <div
          className="card"
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={18} color="var(--gold)" />
            <h2 className="type-h2" style={{ fontSize: '1.25rem', margin: 0 }}>
              3. Connected Services (Jira &amp; Slack)
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            If you connect optional workspace tools:
          </p>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
            <li><strong>Atlassian Jira:</strong> We push action items into your designated Jira project backlog upon user request. We do not inspect unrelated Jira issues outside your project key.</li>
            <li><strong>Slack:</strong> We dispatch summary notifications and action item alerts strictly to the specific webhook channel configured in your settings.</li>
          </ul>
        </div>

        {/* Section 4: Data Security & Retention */}
        <div
          className="card"
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} color="var(--status-success)" />
            <h2 className="type-h2" style={{ fontSize: '1.25rem', margin: 0 }}>
              4. Data Protection &amp; User Rights
            </h2>
          </div>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
            <li><strong>Encryption:</strong> All data transmissions are protected via Transport Layer Security (TLS 1.3). Database records are encrypted at rest.</li>
            <li><strong>Access Control:</strong> Strict database Row-Level Security (RLS) ensures that only the authenticated account owner can view their meetings, transcripts, and action items.</li>
            <li><strong>Data Deletion:</strong> You have the right to request deletion of your account and all associated meeting data at any time by contacting our administrator or using the in-app reset controls.</li>
          </ul>
        </div>

        {/* Section 5: Contact Information */}
        <div
          className="card"
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} color="var(--blue)" />
            <h2 className="type-h2" style={{ fontSize: '1.25rem', margin: 0 }}>
              5. Contact &amp; Questions
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            If you have questions or concerns regarding this Privacy Policy or your data, please contact the development team at:
          </p>
          <div style={{ color: 'var(--blue)', fontSize: '0.875rem', fontWeight: 500 }}>
            support@autosyncmeet.internal
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          &copy; {new Date().getFullYear()} AutoSync Meet. All rights reserved.
        </div>
      </div>
    </div>
  );
}
