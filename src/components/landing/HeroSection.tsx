'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, X, CheckCircle, Sparkles, Layers } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
}

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'flow' | 'decisions' | 'jira'>('flow');

  // Particle Field Simulation (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle color ratio: 45% blue (#3E8EF7), 45% cyan (#5FE7F2), 10% gold (#F2B94D)
    const getColor = (): string => {
      const rand = Math.random();
      if (rand < 0.45) return '#3E8EF7'; // dominant: unresolved conversation
      if (rand < 0.90) return '#5FE7F2'; // secondary: motion / transition
      return '#F2B94D'; // accent: resolved node preview
    };

    // 100-150 particles on desktop, 45 on mobile
    const isMobile = width < 640;
    const particleCount = isMobile ? 45 : 130;
    const particles: Particle[] = [];

    // Spawning from the right two-thirds of the frame (x >= width * 0.35)
    for (let i = 0; i < particleCount; i++) {
      const minX = width * 0.35;
      const x = minX + Math.random() * (width - minX);
      const y = Math.random() * height;
      const vx = -(0.25 + Math.random() * 0.3); // drifting left at ~0.2-0.5px/frame
      const vy = (Math.random() - 0.5) * 0.15;
      const radius = 0.8 + Math.random() * 1.5;
      const baseAlpha = 0.25 + Math.random() * 0.6;

      particles.push({
        x,
        y,
        vx,
        vy,
        radius,
        color: getColor(),
        alpha: baseAlpha,
        baseAlpha,
      });
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cutoffX = width * 0.35; // recycle once they drift past 35% mark

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          // Recycle when drifting past the 35% mark
          if (p.x < cutoffX) {
            p.x = width + Math.random() * 20;
            p.y = Math.random() * height;
            p.color = getColor();
          }

          // Gentle vertical wrap
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        // Soft fade-out as particles approach the 35% threshold
        const distanceToCutoff = p.x - cutoffX;
        const fadeZone = width * 0.25;
        let fadeFactor = 1;
        if (distanceToCutoff < fadeZone) {
          fadeFactor = Math.max(0, distanceToCutoff / fadeZone);
        }

        const currentAlpha = p.baseAlpha * fadeFactor;
        if (currentAlpha <= 0.02) continue;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Handle ESC key to close video modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVideoModalOpen) {
        setIsVideoModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen]);

  return (
    <div className="hero-wrapper">
      <section className="hero-outer-container" aria-label="Hero Introduction">
        {/* Visual System (Layered from back to front) */}
        <div className="hero-visual-stage" aria-hidden="true">
          {/* Layer 1: Particle Field (Canvas) */}
          <canvas ref={canvasRef} className="hero-canvas-layer" />

          {/* Layer 2: Waveform Strands + Resolved Core + Node Network (SVG) */}
          <svg
            className="hero-svg-layer"
            viewBox="0 0 1000 800"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Strand Gradients: Blue and Cyan fading in from transparent, brightening toward core */}
              <linearGradient id="strandGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3E8EF7" stopOpacity="0" />
                <stop offset="40%" stopColor="#3E8EF7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3E8EF7" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="strandGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5FE7F2" stopOpacity="0" />
                <stop offset="45%" stopColor="#5FE7F2" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#5FE7F2" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="strandGrad3" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#3E8EF7" stopOpacity="0" />
                <stop offset="50%" stopColor="#3E8EF7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#5FE7F2" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="strandGrad4" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5FE7F2" stopOpacity="0" />
                <stop offset="55%" stopColor="#3E8EF7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3E8EF7" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="strandGrad5" x1="0%" y1="100%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#3E8EF7" stopOpacity="0" />
                <stop offset="60%" stopColor="#5FE7F2" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#5FE7F2" stopOpacity="0.85" />
              </linearGradient>

              <linearGradient id="strandGrad6" x1="50%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5FE7F2" stopOpacity="0" />
                <stop offset="50%" stopColor="#3E8EF7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3E8EF7" stopOpacity="0.9" />
              </linearGradient>

              {/* Resolved Core Glow Gradient: Soft gold-to-blue glow marking moment of clarity */}
              <radialGradient id="heroResolvedCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F2B94D" stopOpacity="0.8" />
                <stop offset="25%" stopColor="#F2B94D" stopOpacity="0.45" />
                <stop offset="55%" stopColor="#3E8EF7" stopOpacity="0.22" />
                <stop offset="85%" stopColor="#5FE7F2" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#030303" stopOpacity="0" />
              </radialGradient>

              {/* Node Gold Glow Filter */}
              <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 6 Curved Waveform Strands (voices drifting into structure) */}
            <g className="hero-waveform-group">
              {/* Strand 1: High Entry */}
              <path
                d="M 80 140 C 260 90, 480 220, 680 390"
                stroke="url(#strandGrad1)"
                strokeWidth="1.8"
                strokeDasharray="600"
                strokeLinecap="round"
                className="hero-waveform-path"
                style={{ animation: 'hero-waveform-drift 24s linear infinite' }}
              />

              {/* Strand 2: Upper Mid Entry */}
              <path
                d="M 160 260 C 340 210, 520 320, 680 390"
                stroke="url(#strandGrad2)"
                strokeWidth="2.2"
                strokeDasharray="540"
                strokeLinecap="round"
                className="hero-waveform-path"
                style={{ animation: 'hero-waveform-drift 20s linear infinite reverse' }}
              />

              {/* Strand 3: Center Direct Waveform */}
              <path
                d="M 110 390 C 310 340, 510 440, 680 390"
                stroke="url(#strandGrad3)"
                strokeWidth="2"
                strokeDasharray="580"
                strokeLinecap="round"
                className="hero-waveform-path"
                style={{ animation: 'hero-waveform-drift 28s linear infinite' }}
              />

              {/* Strand 4: Lower Swell */}
              <path
                d="M 140 540 C 330 580, 520 470, 680 390"
                stroke="url(#strandGrad4)"
                strokeWidth="2.4"
                strokeDasharray="560"
                strokeLinecap="round"
                className="hero-waveform-path"
                style={{ animation: 'hero-waveform-drift 22s linear infinite reverse' }}
              />

              {/* Strand 5: Bottom Rising Wave */}
              <path
                d="M 280 680 C 440 690, 560 520, 680 390"
                stroke="url(#strandGrad5)"
                strokeWidth="1.8"
                strokeDasharray="520"
                strokeLinecap="round"
                className="hero-waveform-path"
                style={{ animation: 'hero-waveform-drift 26s linear infinite' }}
              />

              {/* Strand 6: Top Arc Sweep */}
              <path
                d="M 420 50 C 530 120, 610 250, 680 390"
                stroke="url(#strandGrad6)"
                strokeWidth="2"
                strokeDasharray="500"
                strokeLinecap="round"
                className="hero-waveform-path"
                style={{ animation: 'hero-waveform-drift 21s linear infinite' }}
              />
            </g>

            {/* Resolved Core (Moment of Clarity: Gold to Blue Glow) */}
            <g transform="translate(680, 390)">
              {/* Outer soft radiant ambient field */}
              <circle cx="0" cy="0" r="140" fill="url(#heroResolvedCoreGlow)" />

              {/* Mid transition aura */}
              <circle
                cx="0"
                cy="0"
                r="36"
                fill="#3E8EF7"
                fillOpacity="0.18"
                stroke="#5FE7F2"
                strokeWidth="1"
                strokeOpacity="0.3"
              />

              {/* Central clarity focal point */}
              <circle cx="0" cy="0" r="8" fill="#F2B94D" filter="url(#goldGlow)" />
            </g>

            {/* Node Network (5 nodes around resolved core, connected by thin low-opacity gold lines) */}
            {/* Connecting Lines between Core and Nodes */}
            <g stroke="#F2B94D" strokeWidth="1" strokeOpacity="0.22" strokeDasharray="3 3">
              {/* Lines from core (680, 390) to each node */}
              <line x1="680" y1="390" x2="810" y2="290" />
              <line x1="680" y1="390" x2="860" y2="420" />
              <line x1="680" y1="390" x2="790" y2="535" />
              <line x1="680" y1="390" x2="560" y2="520" />
              <line x1="680" y1="390" x2="550" y2="280" />

              {/* Perimeter interconnected lines creating network structure */}
              <line x1="810" y1="290" x2="860" y2="420" />
              <line x1="860" y1="420" x2="790" y2="535" />
              <line x1="790" y1="535" x2="560" y2="520" />
              <line x1="560" y1="520" x2="550" y2="280" />
              <line x1="550" y1="280" x2="810" y2="290" />
            </g>

            {/* Node 1: Decision Log (Top-Right) */}
            <g transform="translate(810, 290)">
              <circle
                className="hero-node-element"
                cx="0"
                cy="0"
                r="13"
                stroke="#F2B94D"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                fill="none"
                style={{ animation: 'hero-node-pulse 3s infinite ease-in-out', animationDelay: '0s' }}
              />
              <circle cx="0" cy="0" r="4.5" fill="#F2B94D" filter="url(#goldGlow)" />
              {/* Product Meaning: Decision */}
              <rect x="18" y="-12" width="94" height="24" rx="12" fill="#15171C" stroke="rgba(242, 185, 77, 0.3)" />
              <text x="28" y="4" fill="#FAFAFA" fontSize="10.5" fontFamily="Inter" fontWeight="600" letterSpacing="0.04em">
                DECISION
              </text>
            </g>

            {/* Node 2: Jira Task Created (Far-Right) */}
            <g transform="translate(860, 420)">
              <circle
                className="hero-node-element"
                cx="0"
                cy="0"
                r="13"
                stroke="#F2B94D"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                fill="none"
                style={{ animation: 'hero-node-pulse 3s infinite ease-in-out', animationDelay: '0.6s' }}
              />
              <circle cx="0" cy="0" r="4.5" fill="#F2B94D" filter="url(#goldGlow)" />
              {/* Product Meaning: Task */}
              <rect x="18" y="-12" width="92" height="24" rx="12" fill="#15171C" stroke="rgba(242, 185, 77, 0.3)" />
              <text x="28" y="4" fill="#FAFAFA" fontSize="10.5" fontFamily="Inter" fontWeight="600" letterSpacing="0.04em">
                JIRA TASK
              </text>
            </g>

            {/* Node 3: Assignee & Follow-through (Bottom-Right) */}
            <g transform="translate(790, 535)">
              <circle
                className="hero-node-element"
                cx="0"
                cy="0"
                r="13"
                stroke="#F2B94D"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                fill="none"
                style={{ animation: 'hero-node-pulse 3s infinite ease-in-out', animationDelay: '1.2s' }}
              />
              <circle cx="0" cy="0" r="4.5" fill="#F2B94D" filter="url(#goldGlow)" />
              {/* Product Meaning: Assignee */}
              <rect x="18" y="-12" width="86" height="24" rx="12" fill="#15171C" stroke="rgba(242, 185, 77, 0.3)" />
              <text x="28" y="4" fill="#FAFAFA" fontSize="10.5" fontFamily="Inter" fontWeight="600" letterSpacing="0.04em">
                ASSIGNEE
              </text>
            </g>

            {/* Node 4: Deadline (Bottom-Left) */}
            <g transform="translate(560, 520)">
              <circle
                className="hero-node-element"
                cx="0"
                cy="0"
                r="13"
                stroke="#F2B94D"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                fill="none"
                style={{ animation: 'hero-node-pulse 3s infinite ease-in-out', animationDelay: '1.8s' }}
              />
              <circle cx="0" cy="0" r="4.5" fill="#F2B94D" filter="url(#goldGlow)" />
              {/* Product Meaning: Deadline */}
              <rect x="-98" y="-12" width="84" height="24" rx="12" fill="#15171C" stroke="rgba(242, 185, 77, 0.3)" />
              <text x="-88" y="4" fill="#FAFAFA" fontSize="10.5" fontFamily="Inter" fontWeight="600" letterSpacing="0.04em">
                DEADLINE
              </text>
            </g>

            {/* Node 5: Commitment (Top-Left) */}
            <g transform="translate(550, 280)">
              <circle
                className="hero-node-element"
                cx="0"
                cy="0"
                r="13"
                stroke="#F2B94D"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                fill="none"
                style={{ animation: 'hero-node-pulse 3s infinite ease-in-out', animationDelay: '2.4s' }}
              />
              <circle cx="0" cy="0" r="4.5" fill="#F2B94D" filter="url(#goldGlow)" />
              {/* Product Meaning: Action Item */}
              <rect x="-106" y="-12" width="92" height="24" rx="12" fill="#15171C" stroke="rgba(242, 185, 77, 0.3)" />
              <text x="-96" y="4" fill="#FAFAFA" fontSize="10.5" fontFamily="Inter" fontWeight="600" letterSpacing="0.04em">
                SYNTHESIS
              </text>
            </g>
          </svg>
        </div>

        {/* Content Layer (Nav + Left Column Headline & CTA) */}
        <div className="hero-content-layer">
          {/* Navigation Bar */}
          <nav className="hero-nav" aria-label="Main Navigation">
            {/* Logo Mark: 34px rounded-square glass with 7px pulsing blue dot */}
            <Link href="/" className="hero-logo-container" aria-label="Converge AI Home">
              <div className="hero-logo-mark">
                <div className="hero-listening-dot" />
              </div>
              <span className="hero-brand-name">Converge AI</span>
            </Link>

            {/* Five Nav Links */}
            <div className="hero-nav-links">
              <Link href="/" className="hero-nav-link active">
                Home
              </Link>
              <a href="#features" className="hero-nav-link">
                Features
              </a>
              <a href="#integrations" className="hero-nav-link">
                Integrations
              </a>
              <a href="#pricing" className="hero-nav-link">
                Pricing
              </a>
              <Link href="/dashboard" className="hero-nav-link">
                Console
              </Link>
            </div>

            {/* Far Right: 52px Circular Glass Play Button */}
            <button
              type="button"
              className="hero-play-btn"
              onClick={() => setIsVideoModalOpen(true)}
              aria-label="Watch how it works"
            >
              <Play size={18} fill="#FAFAFA" strokeWidth={0} />
            </button>
          </nav>

          {/* Hero Main Grid */}
          <div className="hero-main-grid">
            <div className="hero-text-column">
              {/* Eyebrow: Inter, 10.5px, 600, uppercase, 0.16em tracking, glass pill */}
              <div className="hero-eyebrow">
                [ CONVERSATION, DECODED ]
              </div>

              {/* Headline: Space Grotesk, clamp(42px, 6.2vw, 84px), 700. Two lines exactly */}
              <h1 className="hero-headline">
                <span className="hero-headline-line">Meetings</span>
                <span className="hero-headline-line">Understood.</span>
              </h1>

              {/* Lede Paragraph: Inter, 20px, 400, --hero-text-muted, max-width 480px, line-height 1.55 */}
              <p className="hero-lede">
                An AI that joins your meetings, listens to every voice, and distills the chaos into clear decisions, structured tasks, and effortless momentum.
              </p>

              {/* CTA: Warm-to-magenta gradient pill with dark text (#241318) */}
              <Link href="/dashboard" className="hero-cta-btn">
                START LISTENING
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 'How it works' Modal */}
      {isVideoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Watch How Converge AI Works"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(3, 3, 3, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '820px',
              backgroundColor: '#0A0C10',
              border: '1px solid #1C1D20',
              borderRadius: '24px',
              boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 32px rgba(62, 142, 247, 0.15)',
              padding: '32px',
              color: '#FAFAFA',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(62, 142, 247, 0.15)',
                    border: '1px solid rgba(62, 142, 247, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={16} color="#5FE7F2" />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>
                    How Converge AI Works
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--hero-text-muted)', marginTop: '2px' }}>
                    Many voices, converging into one clear structure.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FAFAFA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
                aria-label="Close interactive demo"
              >
                <X size={18} />
              </button>
            </div>

            {/* Interactive Tab Switcher */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('flow')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'flow' ? '#1C1D20' : 'transparent',
                  color: activeTab === 'flow' ? '#FAFAFA' : 'var(--hero-text-muted)',
                  transition: 'all 150ms ease',
                }}
              >
                1. Voice Waveforms
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('decisions')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'decisions' ? '#1C1D20' : 'transparent',
                  color: activeTab === 'decisions' ? '#FAFAFA' : 'var(--hero-text-muted)',
                  transition: 'all 150ms ease',
                }}
              >
                2. Resolved Core
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('jira')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'jira' ? '#1C1D20' : 'transparent',
                  color: activeTab === 'jira' ? '#FAFAFA' : 'var(--hero-text-muted)',
                  transition: 'all 150ms ease',
                }}
              >
                3. Dispatched Action Items
              </button>
            </div>

            {/* Interactive Demo Content Preview */}
            <div
              style={{
                backgroundColor: '#060709',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {activeTab === 'flow' && (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: 'rgba(62, 142, 247, 0.12)',
                      border: '1px solid rgba(62, 142, 247, 0.25)',
                      color: '#5FE7F2',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3E8EF7' }} />
                    Autonomous Audio Ingestion
                  </div>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    Zero setup. Joins your Google Meet seamlessly.
                  </h4>
                  <p style={{ color: 'var(--hero-text-muted)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                    As attendees speak, independent audio waveforms are ingested with millisecond diarization, tracking speaker attribution and dialogue flow.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', color: '#94A3B8' }}>
                      Host: Rajiv C.
                    </span>
                    <span style={{ fontSize: '11.5px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', color: '#94A3B8' }}>
                      Bot: Recall AI Ingestion
                    </span>
                    <span style={{ fontSize: '11.5px', background: 'rgba(62, 142, 247, 0.15)', padding: '6px 12px', borderRadius: '6px', color: '#3E8EF7' }}>
                      Status: Live Streaming
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'decisions' && (
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: 'rgba(242, 185, 77, 0.12)',
                      border: '1px solid rgba(242, 185, 77, 0.3)',
                      color: '#F2B94D',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '16px',
                    }}
                  >
                    <Sparkles size={13} color="#F2B94D" />
                    Resolved Synthesis Core
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
                    High-Trust Extracted Decisions:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(242, 185, 77, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <CheckCircle size={16} color="#F2B94D" />
                      <span style={{ fontSize: '13.5px', color: '#FAFAFA' }}>
                        API Architecture frozen for Q3 — pgvector similarity search selected for transcript queries.
                      </span>
                    </div>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <CheckCircle size={16} color="#F2B94D" />
                      <span style={{ fontSize: '13.5px', color: '#FAFAFA' }}>
                        Auto-dispatch to Jira enabled for all action items with explicit assignee mentions.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'jira' && (
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: 'rgba(95, 231, 242, 0.12)',
                      border: '1px solid rgba(95, 231, 242, 0.3)',
                      color: '#5FE7F2',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '16px',
                    }}
                  >
                    <Layers size={13} color="#5FE7F2" />
                    Autonomous Task Dispatch
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
                    Instant Jira Kanban Issue Creation
                  </h4>
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid #1C1D20',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#3E8EF7', fontWeight: 700 }}>ENG-412</span>
                      <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600 }}>Synced to Jira</span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#FAFAFA', marginBottom: '6px' }}>
                      Implement Supabase pgvector cosine indexing for fast meeting similarity retrieval
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--hero-text-muted)' }}>
                      <span>Assignee: Sarah Jenkins</span>
                      <span>Priority: High</span>
                      <span>Due: Next Friday</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '999px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FAFAFA',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <Link
                href="/dashboard"
                className="hero-cta-btn"
                style={{ height: '42px', padding: '0 24px', fontSize: '12px' }}
                onClick={() => setIsVideoModalOpen(false)}
              >
                Launch Console
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
