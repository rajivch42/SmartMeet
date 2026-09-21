'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Meeting, ActionItem } from '@/types/database';

interface DashboardContextType {
  meetings: Meeting[];
  meetingsLoading: boolean;
  syncingCalendar: boolean;
  dispatchingBotId: string | null;
  statusMessage: string | null;
  setStatusMessage: (msg: string | null) => void;

  tasks: ActionItem[];
  tasksLoading: boolean;

  meetingCount: number;
  taskCount: number;
  syncedCount: number;
  decisionCount: number;
  timeSaved: string;

  fetchMeetings: (silent?: boolean) => Promise<void>;
  fetchTasks: (silent?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
  syncCalendar: () => Promise<{ success: boolean; count?: number; message?: string }>;
  dispatchBot: (meetingId: string) => Promise<{ success: boolean; message?: string }>;
  syncBotTranscript: (meetingId: string) => Promise<{ success: boolean; status?: string; message?: string }>;
  addMeeting: (newMeeting: Meeting) => void;
  resetDemoState: () => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState<boolean>(true);
  const [syncingCalendar, setSyncingCalendar] = useState<boolean>(false);
  const [dispatchingBotId, setDispatchingBotId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);

  // Computed metrics
  const meetingCount = meetings.length;
  const taskCount = tasks.length;
  const syncedCount = tasks.filter((t) => t.status === 'synced_to_jira').length;
  const decisionCount = syncedCount * 2;
  const timeSaved = (meetingCount * 1.5).toFixed(1) + 'h';

  const fetchMeetings = useCallback(async (silent = false) => {
    if (!silent) setMeetingsLoading(true);
    try {
      const res = await fetch('/api/meetings');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMeetings(json.data);
      }
    } catch (err) {
      console.error('[DashboardContext] Failed to fetch meetings:', err);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setTasksLoading(true);
    try {
      const res = await fetch('/api/integrations/jira');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error('[DashboardContext] Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMeetings(true), fetchTasks(true)]);
  }, [fetchMeetings, fetchTasks]);

  // Initial fetch once on layout mount (cached in memory for all tabs)
  useEffect(() => {
    fetchMeetings(false);
    fetchTasks(false);
  }, [fetchMeetings, fetchTasks]);

  const syncCalendar = useCallback(async () => {
    try {
      setSyncingCalendar(true);
      setStatusMessage(null);
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMeetings(json.data);
        const msg = `Successfully synchronized ${json.count} calendar meetings.`;
        setStatusMessage(msg);
        return { success: true, count: json.count, message: msg };
      } else {
        const msg = json.error?.message || 'Calendar sync encountered an issue.';
        setStatusMessage(msg);
        return { success: false, message: msg };
      }
    } catch {
      const msg = 'Network error while synchronizing calendar.';
      setStatusMessage(msg);
      return { success: false, message: msg };
    } finally {
      setSyncingCalendar(false);
    }
  }, []);

  const dispatchBot = useCallback(async (meetingId: string) => {
    try {
      setDispatchingBotId(meetingId);
      setStatusMessage(null);
      const res = await fetch('/api/bot/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, simulate_complete: false }),
      });
      const json = await res.json();
      if (json.success) {
        const msg = json.data?.message || 'Bot dispatched successfully!';
        setStatusMessage(msg);
        await refreshAll();
        return { success: true, message: msg };
      } else {
        const msg = json.error?.message || 'Failed to dispatch bot.';
        setStatusMessage(msg);
        return { success: false, message: msg };
      }
    } catch {
      const msg = 'Network error while dispatching bot.';
      setStatusMessage(msg);
      return { success: false, message: msg };
    } finally {
      setDispatchingBotId(null);
    }
  }, [refreshAll]);

  const syncBotTranscript = useCallback(async (meetingId: string) => {
    try {
      const res = await fetch('/api/bot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const json = await res.json();
      if (json.success) {
        const msg = json.data?.message || 'Bot status updated.';
        setStatusMessage(msg);
        await refreshAll();
        return { success: true, status: json.data?.status, message: msg };
      } else {
        const msg = json.error?.message || 'Failed to sync bot.';
        setStatusMessage(msg);
        return { success: false, message: msg };
      }
    } catch {
      const msg = 'Network error syncing bot transcript.';
      setStatusMessage(msg);
      return { success: false, message: msg };
    }
  }, [refreshAll]);

  const addMeeting = useCallback((newMeeting: Meeting) => {
    setMeetings((prev) => {
      // Avoid duplicate insertion
      if (prev.some((m) => m.id === newMeeting.id)) {
        return prev;
      }
      return [newMeeting, ...prev];
    });
  }, []);

  const resetDemoState = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await refreshAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshAll]);

  return (
    <DashboardContext.Provider
      value={{
        meetings,
        meetingsLoading,
        syncingCalendar,
        dispatchingBotId,
        statusMessage,
        setStatusMessage,
        tasks,
        tasksLoading,
        meetingCount,
        taskCount,
        syncedCount,
        decisionCount,
        timeSaved,
        fetchMeetings,
        fetchTasks,
        refreshAll,
        syncCalendar,
        dispatchBot,
        syncBotTranscript,
        addMeeting,
        resetDemoState,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
