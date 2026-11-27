import Link from 'next/link';
import {
  Calendar,
  FileText,
  CheckSquare,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Bot,
  Zap,
  Clock,
} from 'lucide-react';
import SmartMeetShowcase from '@/components/landing/SmartMeetShowcase';

export default function HomePage() {
  return (
    <main className="landing-main-root">
      {/* Top Floating Glass Navigation: Strict 3-Column Balanced Layout */}
      <header className="landing-header">
        <div className="landing-header-inner">
          {/* 1. Left: Brand & Logo */}
          <Link href="/" className="landing-brand-logo">
            <div className="landing-logo-mark">
              <span className="landing-logo-dot" />
            </div>
            <span className="landing-brand-title">AutoSync Meet</span>
          </Link>

          {/* 2. Center: Centered Navigation Links */}
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#workflow" className="landing-nav-link">How it works</a>
            <a href="#integrations" className="landing-nav-link">Integrations</a>
          </nav>

          {/* 3. Right: Sign in (plain text link) + Start free (filled button) */}
          <div className="landing-auth-cta">
            <Link href="/login" className="landing-login-text-link">
              Sign in
            </Link>
            <Link href="/login" className="landing-signup-btn">
              <span>Start free</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Showcase (Interactive Card Component with Exact Layout & Orbiting Chips) */}
      <section className="landing-hero-section">
        <SmartMeetShowcase />
      </section>

      {/* Feature Capabilities Grid */}
      <section id="features" className="landing-features-section">
        <div className="landing-section-header">
          <div className="landing-section-pill">
            <Sparkles size={13} color="#6366F1" />
            <span>Autonomous Intelligence Suite</span>
          </div>
          <h2 className="landing-section-title">
            From Spoken Dialogue to Shipped Backlog
          </h2>
          <p className="landing-section-desc">
            Everything your engineering and product pod needs to eliminate manual notetaking, status chase-ups, and lost decisions.
          </p>
        </div>

        <div className="landing-cards-grid">
          {/* Card 1: Bot Dispatch */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
              <Bot size={22} />
            </div>
            <h3 className="feature-card-title">Autonomous Meeting Bot</h3>
            <p className="feature-card-text">
              Recall.ai powered notetaker detects scheduled Google Meet links from your calendar and joins automatically 2 minutes prior.
            </p>
            <div className="feature-card-tag">Recall.ai Integration</div>
          </div>

          {/* Card 2: Diarized Transcripts */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' }}>
              <FileText size={22} />
            </div>
            <h3 className="feature-card-title">Speaker-Labelled Transcripts</h3>
            <p className="feature-card-text">
              Real-time multi-speaker speech-to-text with timestamps and attendee attribution. Search through hours of discussion in seconds.
            </p>
            <div className="feature-card-tag">Speaker Diarization</div>
          </div>

          {/* Card 3: LLM Synthesis */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
              <Sparkles size={22} />
            </div>
            <h3 className="feature-card-title">Gemini &amp; Claude Synthesis</h3>
            <p className="feature-card-text">
              Extracts high-signal executive summaries, explicit architectural decisions, and key discussion threads with zero fluff.
            </p>
            <div className="feature-card-tag">Dual-Engine Intelligence</div>
          </div>

          {/* Card 4: Jira Backlog Sync */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(0, 82, 204, 0.12)', color: '#60A5FA' }}>
              <CheckSquare size={22} />
            </div>
            <h3 className="feature-card-title">1-Click Jira Cloud Export</h3>
            <p className="feature-card-text">
              Detected commitments automatically convert into Atlassian Jira issues with assignees, deadlines, and direct source links.
            </p>
            <div className="feature-card-tag">Atlassian Cloud v3</div>
          </div>

          {/* Card 5: Slack Reminders */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>
              <MessageSquare size={22} />
            </div>
            <h3 className="feature-card-title">Slack Channel Broadcasts</h3>
            <p className="feature-card-text">
              Instant meeting debriefs broadcasted to your #meeting-summaries channel with scheduled task deadline reminders.
            </p>
            <div className="feature-card-tag">Slack Webhook Engine</div>
          </div>

          {/* Card 6: Enterprise Security */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 className="feature-card-title">Postgres Row-Level Security</h3>
            <p className="feature-card-text">
              Supabase Auth, encrypted token storage, and strict database RLS isolate each team&apos;s meetings and sensitive dialogue.
            </p>
            <div className="feature-card-tag">Enterprise Auth &amp; RLS</div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Steps */}
      <section id="workflow" className="landing-workflow-section">
        <div className="landing-section-header">
          <div className="landing-section-pill">
            <Clock size={13} color="#3B82F6" />
            <span>Seamless 4-Step Pipeline</span>
          </div>
          <h2 className="landing-section-title">How AutoSync Meet Works</h2>
        </div>

        <div className="workflow-steps-container">
          <div className="workflow-step-card">
            <div className="step-number">01</div>
            <h4>Sync Schedule</h4>
            <p>Connect your Google Calendar or paste an ad-hoc Meet URL whenever a call begins.</p>
          </div>
          <div className="workflow-step-arrow">→</div>

          <div className="workflow-step-card">
            <div className="step-number">02</div>
            <h4>Bot Records</h4>
            <p>Our autonomous bot joins the call and records multi-speaker audio silently.</p>
          </div>
          <div className="workflow-step-arrow">→</div>

          <div className="workflow-step-card">
            <div className="step-number">03</div>
            <h4>LLM Synthesizes</h4>
            <p>Gemini analyzes the transcript to pull decisions, summaries, and action items.</p>
          </div>
          <div className="workflow-step-arrow">→</div>

          <div className="workflow-step-card">
            <div className="step-number">04</div>
            <h4>Sync &amp; Notify</h4>
            <p>Export tasks into Jira Cloud and post concise recaps to your Slack channel.</p>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="landing-workflow-section" style={{ paddingTop: 0 }}>
        <div className="landing-section-header">
          <div className="landing-section-pill">
            <Zap size={13} color="#F59E0B" />
            <span>Ecosystem Connectors</span>
          </div>
          <h2 className="landing-section-title">Direct Enterprise Integrations</h2>
          <p className="landing-section-desc">
            Native integrations with the tools your engineering, product, and leadership teams already rely on.
          </p>
        </div>

        <div className="landing-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div className="feature-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="feature-icon-wrapper" style={{ background: 'rgba(66, 133, 244, 0.12)', color: '#4285F4' }}>
              <Calendar size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFF', margin: '0 0 6px 0' }}>Google Meet</h4>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0 }}>Automated bot joining &amp; multi-speaker audio recording.</p>
          </div>

          <div className="feature-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="feature-icon-wrapper" style={{ background: 'rgba(0, 82, 204, 0.12)', color: '#0052CC' }}>
              <CheckSquare size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFF', margin: '0 0 6px 0' }}>Atlassian Jira</h4>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0 }}>One-click action item dispatch to Jira project backlogs.</p>
          </div>

          <div className="feature-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="feature-icon-wrapper" style={{ background: 'rgba(224, 30, 90, 0.12)', color: '#E01E5A' }}>
              <MessageSquare size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFF', margin: '0 0 6px 0' }}>Slack Channels</h4>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0 }}>Automated debrief broadcasts &amp; task deadline reminders.</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="landing-bottom-cta">
        <div className="bottom-cta-card">
          <h2 className="bottom-cta-title">Ready to turn meetings into momentum?</h2>
          <p className="bottom-cta-text">
            Start capturing decisions, assigning Jira tasks, and broadcasting summaries in minutes.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link href="/login" className="smartmeet-primary-btn" style={{ padding: '0.9rem 2.2rem', fontSize: '1.05rem' }}>
              Start free <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer (Contains Legal Privacy Policy link strictly per Spec) */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand-logo">
            <span className="landing-brand-title" style={{ fontSize: '1rem' }}>AutoSync Meet</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
            &copy; {new Date().getFullYear()} AutoSync Meet Platform. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem' }}>
            <Link href="/privacy" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Privacy Policy</Link>
            <Link href="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>Sign In</Link>
            <Link href="/dashboard" style={{ color: '#94A3B8', textDecoration: 'none' }}>Live Console</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
