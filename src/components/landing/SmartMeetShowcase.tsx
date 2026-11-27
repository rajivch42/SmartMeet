'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Bot, Mic, Zap, ArrowRight, Calendar, ShieldCheck, Play } from 'lucide-react';

export default function SmartMeetShowcase() {
  return (
    <div className="smartmeet-wrapper">
      <div className="smartmeet-card">
        {/* Subtle Decorative Background Grid */}
        <div className="smartmeet-grid-bg" />

        {/* Ambient Glows */}
        <div className="smartmeet-glow-left" />
        <div className="smartmeet-glow-right" />

        {/* Main 2-Column Content */}
        <div className="smartmeet-content">
          {/* Left Column: Copy & Brand */}
          <div className="smartmeet-left-col">
            {/* Top Brand Pill: AI meeting assistant for Google Meet */}
            <div className="smartmeet-brand-pill">
              <span className="smartmeet-live-dot" />
              <span className="smartmeet-brand-text">AI meeting assistant for Google Meet</span>
            </div>

            {/* Main Headline */}
            <h1 className="smartmeet-headline">
              Your meetings, turned into{' '}
              <span className="smartmeet-gradient-text">action items.</span>
              <br />
              Automatically.
            </h1>

            {/* Benefit-Driven 2-Line Subtext */}
            <p className="smartmeet-subtext">
              AutoSync joins your Google Meet calls, records and transcribes them, then creates Jira tickets and posts summaries to Slack. No manual follow-up.
            </p>

            {/* Action Buttons: Single focused CTA */}
            <div className="smartmeet-actions">
              <Link href="/login" className="smartmeet-primary-btn">
                <span>Start free</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* High-Contrast Trust Badges */}
            <div className="smartmeet-trust-bar">
              <span className="smartmeet-trust-item">
                <ShieldCheck size={16} className="trust-icon" color="#059669" />
                <span>End-to-end encrypted</span>
              </span>
              <span className="smartmeet-trust-item">
                <Calendar size={16} className="trust-icon" color="#2563EB" />
                <span>Google Meet &amp; Calendar</span>
              </span>
              <span className="smartmeet-trust-item">
                <Zap size={16} className="trust-icon" color="#D97706" />
                <span>Jira &amp; Slack</span>
              </span>
            </div>
          </div>

          {/* Right Column: Portal with Balanced Orbiting Badges */}
          <div className="smartmeet-right-col">
            <div className="smartmeet-portal-stage">
              {/* Outer Orbital Rings */}
              <div className="smartmeet-orbit-ring smartmeet-orbit-outer" />
              <div className="smartmeet-orbit-ring smartmeet-orbit-mid" />

              {/* Decorative Particle Dots */}
              <div className="smartmeet-sparkle sparkle-1">✦</div>
              <div className="smartmeet-sparkle sparkle-2">✦</div>
              <div className="smartmeet-sparkle sparkle-3">★</div>

              {/* Central Glowing Portal Frame */}
              <div className="smartmeet-portal-ring">
                <div className="smartmeet-photo-frame">
                  <img
                    src="/team-collaborating.jpg"
                    alt="Team Collaborating with AutoSync Meet"
                    className="smartmeet-team-photo"
                  />
                </div>
              </div>

              {/* Orbiting Badge 1: Top (Summaries & action items) */}
              <div className="smartmeet-badge badge-top">
                <span className="badge-icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5' }}>
                  <FileText size={15} />
                </span>
                <span className="badge-label">Summaries &amp; action items</span>
              </div>

              {/* Orbiting Badge 2: Right (Auto-joins your meetings) */}
              <div className="smartmeet-badge badge-right">
                <span className="badge-icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB' }}>
                  <Bot size={15} />
                </span>
                <span className="badge-label">Auto-joins your meetings</span>
              </div>

              {/* Orbiting Badge 3: Bottom (Speaker-labelled transcripts) */}
              <div className="smartmeet-badge badge-bottom">
                <span className="badge-icon-box" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333EA' }}>
                  <Mic size={15} />
                </span>
                <span className="badge-label">Speaker-labelled transcripts</span>
              </div>

              {/* Orbiting Badge 4: Left (Auto-sync to Jira & Slack) */}
              <div className="smartmeet-badge badge-left">
                <span className="badge-icon-box" style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#D97706' }}>
                  <Zap size={15} />
                </span>
                <span className="badge-label">Auto-sync to Jira &amp; Slack</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
