'use client';

import React from 'react';

interface MetricsStackProps {
  timeSaved: string;
  totalTasks: number;
  syncedTasks: number;
}

export default function MetricsStack({
  timeSaved,
  totalTasks,
  syncedTasks,
}: MetricsStackProps) {
  const displayTime = timeSaved || '0.0h';
  const displayTotal = totalTasks;
  const displaySynced = syncedTasks;

  // Segmented progress bars (5 segments) based on ratio of synced to total
  const segments = [1, 2, 3, 4, 5];
  const filledSegments = displayTotal > 0 ? Math.round((displaySynced / displayTotal) * 5) : 0;

  return (
    <div className="dash-metrics-column">
      {/* Metric Card 1: Time Saved */}
      <div className="dash-metric-card">
        <span className="dash-metric-label">Time Saved</span>
        <div className="dash-metric-value-huge">{displayTime}</div>
        <p className="dash-metric-desc">On transcription, summaries, and Jira sync.</p>
      </div>

      {/* Metric Card 2: Action Items Extracted */}
      <div className="dash-metric-card">
        <div className="dash-metric-top-row">
          <span className="dash-metric-label">Action Items Extracted</span>
          {/* Integrated Jira + Slack Brand Mini Badges */}
          <div className="dash-integrations-cluster">
            {/* Jira Diamond */}
            <div className="dash-icon-jira-chip" title="Jira Cloud">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11.5 2L2 11.5L11.5 21L21 11.5L11.5 2Z"
                  fill="#0052CC"
                />
                <path
                  d="M11.5 6.5L6.5 11.5L11.5 16.5L16.5 11.5L11.5 6.5Z"
                  fill="#2684FF"
                />
              </svg>
            </div>
            {/* Slack Color Bars */}
            <div className="dash-icon-slack-chip" title="Slack">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#E01E5A" />
                <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#2EB67D" />
              </svg>
            </div>
          </div>
        </div>

        {/* Big Emerald Number */}
        <div className="dash-metric-value-emerald">{displayTotal}</div>

        {/* 5-Step Segmented Progress Bar */}
        <div className="dash-segmented-bar">
          {segments.map((seg) => {
            const isFilled = seg <= filledSegments;
            return (
              <div
                key={seg}
                className={`dash-segment-pill ${isFilled ? 'filled' : ''}`}
              />
            );
          })}
        </div>

        <p className="dash-metric-desc">
          {displayTotal > 0 ? (
            <>
              <strong style={{ color: '#E2E8F0' }}>{displaySynced} of {displayTotal}</strong> synced to Jira &amp; Slack Cloud
            </>
          ) : (
            'No action items extracted yet'
          )}
        </p>
      </div>
    </div>
  );
}
