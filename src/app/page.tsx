import Link from 'next/link';
import { Calendar, FileText, CheckSquare, MessageSquare, ArrowRight, ShieldCheck, Sparkles, Cpu, Layers } from 'lucide-react';
import HeroSection from '@/components/landing/HeroSection';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#030303', color: '#FAFAFA' }}>
      {/* Converge AI — Hero Section (v1.0 Finalized Spec) */}
      <HeroSection />

      {/* Feature Section — High-Trust Functional Architecture */}
      <section
        id="features"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 24px 100px 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.035)',
              border: '1px solid #1C1D20',
              color: 'var(--hero-text-muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={13} color="var(--hero-cyan)" />
            Autonomous Meeting Infrastructure
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--hero-text-hi)',
              marginBottom: '14px',
            }}
          >
            From verbal dialogue to committed execution
          </h2>

          <p
            style={{
              color: 'var(--hero-text-muted)',
              fontSize: '16px',
              maxWidth: '560px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Engineered for high-output engineering teams and executive pods where decisions must instantly bridge into Jira and calendar workflows.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            width: '100%',
          }}
        >
          {/* Card 1: Google Calendar Sync */}
          <div
            style={{
              background: '#08090C',
              border: '1px solid #1C1D20',
              borderRadius: '16px',
              padding: '28px 24px',
              transition: 'transform 200ms ease, border-color 200ms ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(62, 142, 247, 0.1)',
                border: '1px solid rgba(62, 142, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--hero-blue)',
                marginBottom: '20px',
              }}
            >
              <Calendar size={20} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', marginBottom: '8px', fontWeight: 600, color: 'var(--hero-text-hi)' }}>
              Calendar Dispatch
            </h3>
            <p style={{ color: 'var(--hero-text-muted)', fontSize: '13.5px', lineHeight: 1.6 }}>
              Scans your schedule, isolates video links, and autonomously dispatches the listener bot with zero manual invite hassle.
            </p>
          </div>

          {/* Card 2: Structured AI Synthesis */}
          <div
            style={{
              background: '#08090C',
              border: '1px solid #1C1D20',
              borderRadius: '16px',
              padding: '28px 24px',
              transition: 'transform 200ms ease, border-color 200ms ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(95, 231, 242, 0.1)',
                border: '1px solid rgba(95, 231, 242, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--hero-cyan)',
                marginBottom: '20px',
              }}
            >
              <FileText size={20} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', marginBottom: '8px', fontWeight: 600, color: 'var(--hero-text-hi)' }}>
              Waveform Decoded
            </h3>
            <p style={{ color: 'var(--hero-text-muted)', fontSize: '13.5px', lineHeight: 1.6 }}>
              Extracts high-order decisions, consensus milestones, and assigned follow-throughs from raw multi-speaker transcripts.
            </p>
          </div>

          {/* Card 3: Instant Jira & Slack Dispatch */}
          <div
            style={{
              background: '#08090C',
              border: '1px solid #1C1D20',
              borderRadius: '16px',
              padding: '28px 24px',
              transition: 'transform 200ms ease, border-color 200ms ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(242, 185, 77, 0.1)',
                border: '1px solid rgba(242, 185, 77, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--hero-gold)',
                marginBottom: '20px',
              }}
            >
              <CheckSquare size={20} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', marginBottom: '8px', fontWeight: 600, color: 'var(--hero-text-hi)' }}>
              Jira Kanban Integration
            </h3>
            <p style={{ color: 'var(--hero-text-muted)', fontSize: '13.5px', lineHeight: 1.6 }}>
              Dispatches verbal commitments straight into Jira backlog issues with due dates and verified speaker attribution.
            </p>
          </div>

          {/* Card 4: Semantic Q&A */}
          <div
            style={{
              background: '#08090C',
              border: '1px solid #1C1D20',
              borderRadius: '16px',
              padding: '28px 24px',
              transition: 'transform 200ms ease, border-color 200ms ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(62, 142, 247, 0.1)',
                border: '1px solid rgba(62, 142, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--hero-blue)',
                marginBottom: '20px',
              }}
            >
              <MessageSquare size={20} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', marginBottom: '8px', fontWeight: 600, color: 'var(--hero-text-hi)' }}>
              Transcript Semantic Q&A
            </h3>
            <p style={{ color: 'var(--hero-text-muted)', fontSize: '13.5px', lineHeight: 1.6 }}>
              Query past meeting transcripts in natural language using pgvector similarity search to retrieve timestamped answers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #1C1D20',
          padding: '28px 24px',
          textAlign: 'center',
          color: 'var(--hero-text-muted)',
          fontSize: '13px',
          backgroundColor: '#000000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--hero-blue)', fontWeight: 700 }}>◉ Converge AI</span>
          <span>&bull;</span>
          <span>High-Trust Meeting Intelligence</span>
          <span>&bull;</span>
          <span>Next.js, Supabase, Recall.ai & Gemini</span>
        </div>
      </footer>
    </main>
  );
}
