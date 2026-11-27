'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, Clock, Check } from 'lucide-react';

interface TaskDueDatePopoverProps {
  taskId: string;
  currentDueDate: string | null;
  onUpdate: (taskId: string, dueDate: string | null) => Promise<void>;
  disabled?: boolean;
}

export default function TaskDueDatePopover({
  taskId,
  currentDueDate,
  onUpdate,
  disabled = false,
}: TaskDueDatePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Compute Presets
  const getPresetDates = () => {
    const now = new Date();

    // Today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This Friday (or next Friday if today is Friday or weekend)
    const thisFriday = new Date(today);
    const dayOfWeek = today.getDay(); // 0 is Sunday, 5 is Friday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    thisFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));

    // Next Monday
    const nextMonday = new Date(today);
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));

    const toYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return [
      { label: 'Today', value: toYMD(today) },
      { label: 'Tomorrow', value: toYMD(tomorrow) },
      { label: 'This Friday', value: toYMD(thisFriday) },
      { label: 'Next Monday', value: toYMD(nextMonday) },
    ];
  };

  const handleSelectDate = async (val: string | null) => {
    setSaving(true);
    try {
      await onUpdate(taskId, val);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = currentDueDate
    ? new Date(currentDueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled || saving}
        aria-label={currentDueDate ? `Due date: ${formattedDate}. Click to change` : 'Set due date'}
        className={`task-deadline-pill ${currentDueDate ? 'has-date' : 'no-date'}`}
      >
        <Calendar size={12} className="deadline-icon" />
        <span>{saving ? 'Saving...' : formattedDate ? formattedDate : '+ Set deadline'}</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="task-deadline-popover">
          <div className="deadline-popover-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} color="#94A3B8" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F1F5F9' }}>Set Deadline</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="deadline-popover-close"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>

          {/* 1-Click Quick Presets */}
          <div className="deadline-presets-list">
            {getPresetDates().map((preset) => {
              const isSelected = currentDueDate && currentDueDate.startsWith(preset.value);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectDate(preset.value)}
                  className={`deadline-preset-btn ${isSelected ? 'active' : ''}`}
                >
                  <span>{preset.label}</span>
                  {isSelected && <Check size={12} color="#38BDF8" />}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #1D2232', margin: '8px 0' }} />

          {/* Custom Date Input */}
          <div style={{ padding: '0 4px 6px 4px' }}>
            <label style={{ display: 'block', fontSize: '0.725rem', color: '#94A3B8', marginBottom: '4px' }}>
              Custom Date
            </label>
            <input
              type="date"
              defaultValue={currentDueDate ? currentDueDate.split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectDate(e.target.value);
                }
              }}
              className="deadline-date-input"
            />
          </div>

          {/* Clear Option */}
          {currentDueDate && (
            <div style={{ borderTop: '1px solid #1D2232', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleSelectDate(null)}
                className="deadline-clear-btn"
              >
                Clear deadline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
