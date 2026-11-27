'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Meeting } from '@/types/database';
import { useDashboard } from '@/lib/context/DashboardContext';

export interface UndoToastState {
  meeting: Meeting;
  countdown: number;
}

export function useUndoDeleteMeeting() {
  const { meetings, removeMeetingLocally, restoreMeetingLocally, deleteMeetingApi } = useDashboard();
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);

  const pendingMeetingRef = useRef<Meeting | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Permanently commit deletion to backend
  const commitDelete = useCallback(
    async (meetingId: string) => {
      try {
        await deleteMeetingApi(meetingId);
      } catch (err) {
        console.error('[useUndoDeleteMeeting] Error deleting meeting:', err);
      }
    },
    [deleteMeetingApi]
  );

  // Clean up interval
  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleDeleteMeeting = useCallback(
    (meetingId: string) => {
      const target = meetings.find((m) => m.id === meetingId);
      if (!target) return;

      // If a previous delete was already ticking down, commit it immediately
      if (pendingMeetingRef.current && pendingMeetingRef.current.id !== meetingId) {
        clearCountdown();
        commitDelete(pendingMeetingRef.current.id);
      }

      // Optimistically remove from screen immediately
      pendingMeetingRef.current = target;
      removeMeetingLocally(meetingId);

      // Start 5-second live countdown (5 -> 4 -> 3 -> 2 -> 1 -> finalize)
      clearCountdown();
      let remaining = 5;
      setUndoToast({ meeting: target, countdown: remaining });

      intervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setUndoToast({ meeting: target, countdown: remaining });
        } else {
          // Timer finished (reached 0): finalize deletion in database
          clearCountdown();
          setUndoToast(null);
          if (pendingMeetingRef.current) {
            const finalId = pendingMeetingRef.current.id;
            pendingMeetingRef.current = null;
            commitDelete(finalId);
          }
        }
      }, 1000);
    },
    [meetings, removeMeetingLocally, commitDelete, clearCountdown]
  );

  const handleUndo = useCallback(() => {
    clearCountdown();
    if (pendingMeetingRef.current) {
      const restored = pendingMeetingRef.current;
      pendingMeetingRef.current = null;
      restoreMeetingLocally(restored);
    }
    setUndoToast(null);
  }, [clearCountdown, restoreMeetingLocally]);

  // Flush pending deletion on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
      if (pendingMeetingRef.current) {
        commitDelete(pendingMeetingRef.current.id);
      }
    };
  }, [clearCountdown, commitDelete]);

  return {
    undoToast,
    handleDeleteMeeting,
    handleUndo,
  };
}
