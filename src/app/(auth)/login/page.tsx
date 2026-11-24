'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bot, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const redirectUrl = `${window.location.origin}/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate Google authentication.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, rgba(62, 142, 247, 0.12) 0%, #08090B 70%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2rem',
          backdropFilter: 'blur(16px)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--blue-bg)',
              border: '1px solid rgba(62, 142, 247, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue)',
              marginBottom: '1rem',
              position: 'relative',
            }}
          >
            <Bot size={24} />
            <span
              className="node-pulse-dot"
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              marginBottom: '0.4rem',
            }}
          >
            AutoSync <span style={{ color: 'var(--blue)' }}>Meet</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Sign in to automate your meeting notes, Slack broadcasts, and Jira task tracking.
          </p>
        </div>

        {errorMessage && (
          <div
            className="badge badge-warning"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              fontSize: '0.825rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.8rem',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div style={{ margin: '1.75rem 0', textAlign: 'center', position: 'relative' }}>
          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%' }} />
          <span
            style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-card)',
              padding: '0 0.75rem',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Demo Quick Access
          </span>
        </div>

        <Link
          href="/dashboard"
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          Explore Demo Dashboard <ArrowRight size={16} />
        </Link>

        <p
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          By signing in, you agree to grant read-only access to your Google Calendar for automated meeting bot scheduling.
          <br />
          <Link href="/privacy" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
