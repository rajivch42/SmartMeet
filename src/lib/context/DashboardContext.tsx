'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Meeting, ActionItem } from '@/types/database';

interface DashboardContextType {
  meetings: Meeting[];
  meetingsLoading: boolean;
  syncingCalendar: boolean;
  refreshing: boolean;
  lastUpdatedText: string | null;
  dispatchingBotId: string | null;
  statusMessage: string | null;
  setStatusMessage: (msg: string | null) => void;

  tasks: ActionItem[];
  tasksLoading: boolean;

  meetingCount: number;
  upcomingCount: number;
  completedCount: number;
  taskCount: number;
  syncedCount: number;
  waitingCount: number;
  decisionCount: number;
  timeSaved: string;

  fetchMeetings: (silent?: boolean) => Promise<void>;
  fetchTasks: (silent?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshWithCalendarSync: () => Promise<{ success: boolean; message: string }>;
  syncCalendar: () => Promise<{ success: boolean; count?: number; message?: string }>;
  dispatchBot: (meetingId: string) => Promise<{ success: boolean; message?: string }>;
  syncBotTranscript: (meetingId: string) => Promise<{ success: boolean; status?: string; message?: string }>;
  addMeeting: (newMeeting: Meeting) => void;
  skipMeeting: (meetingId: string) => Promise<{ success: boolean; message?: string }>;
  unskipMeeting: (meetingId: string) => Promise<{ success: boolean; message?: string }>;
  dismissMeeting: (meetingId: string) => Promise<{ success: boolean; message?: string }>;
  deleteMeeting: (meetingId: string) => Promise<{ success: boolean; message?: string }>;
  removeMeetingLocally: (meetingId: string) => void;
  restoreMeetingLocally: (meeting: Meeting) => void;
  deleteMeetingApi: (meetingId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<{ success: boolean; message?: string }>;
  updateTaskDueDate: (taskId: string, dueDate: string | null) => Promise<{ success: boolean; message?: string }>;
  pushTaskToJira: (taskId: string) => Promise<{ success: boolean; jiraKey?: string; message?: string }>;
  pushAllTasksToJira: () => Promise<{ success: boolean; count?: number; message?: string }>;
  resetDemoState: () => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState<boolean>(true);
  const [syncingCalendar, setSyncingCalendar] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);
  const [dispatchingBotId, setDispatchingBotId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);

  // Fetch all meetings from the real API
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

  // Fetch all tasks from the real API
  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setTasksLoading(true);
    try {
      const res = await fetch('/api/action-items');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
      } else {
        // Fallback to Jira route if needed
        const resJira = await fetch('/api/integrations/jira');
        const jsonJira = await resJira.json();
        if (jsonJira.success && Array.isArray(jsonJira.data)) {
          setTasks(jsonJira.data);
        }
      }
    } catch (err) {
      console.error('[DashboardContext] Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMeetings(true), fetchTasks(true)]);
    setLastUpdatedText('Updated just now');
    setTimeout(() => setLastUpdatedText(null), 5000);
  }, [fetchMeetings, fetchTasks]);

  // Combined Refresh: runs Google Calendar sync then pulls fresh DB records
  const refreshWithCalendarSync = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Trigger Calendar Sync
      await fetch('/api/calendar/sync', { method: 'POST' }).catch(() => ({}));
      // 2. Refetch DB data
      await Promise.all([fetchMeetings(true), fetchTasks(true)]);
      setLastUpdatedText('Updated just now');
      setTimeout(() => setLastUpdatedText(null), 5000);
      return { success: true, message: 'All meetings and action items synchronized.' };
    } catch {
      return { success: false, message: 'Failed to synchronize with calendar.' };
    } finally {
      setRefreshing(false);
    }
  }, [fetchMeetings, fetchTasks]);

  // Initial fetch on mount
  useEffect(() => {
    fetchMeetings(false);
    fetchTasks(false);
  }, [fetchMeetings, fetchTasks]);

  // Polling every 35 seconds when tab is active + refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      refreshAll();
    };

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshAll();
      }
    }, 35000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshAll]);

  // Calendar Sync Action
  const syncCalendar = useCallback(async () => {
    try {
      setSyncingCalendar(true);
      setStatusMessage(null);
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMeetings(json.data);
        const msg = `Successfully synchronized ${json.count ?? json.data.length} calendar meetings.`;
        setStatusMessage(msg);
        return { success: true, count: json.count ?? json.data.length, message: msg };
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

  // Bot Dispatch Action
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

  // Bot Transcript Sync
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

  // Active Bot Auto-Sync Poller: automatically polls /api/bot/sync every 12 seconds while bot is active
  useEffect(() => {
    const activeMeetings = meetings.filter(
      (m) => (m.status === 'bot_dispatched' || m.status === 'in_progress') && Boolean(m.recall_bot_id)
    );

    if (activeMeetings.length === 0) return;

    const interval = setInterval(() => {
      for (const m of activeMeetings) {
        syncBotTranscript(m.id).catch(() => {});
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [meetings, syncBotTranscript]);

  // Delete Action Item
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      // Optimistic update
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      const res = await fetch(`/api/action-items?id=${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await refreshAll();
        return { success: true, message: 'Action item removed.' };
      } else {
        await fetchTasks(true);
        return { success: false, message: json.error?.message || 'Failed to delete task.' };
      }
    } catch {
      await fetchTasks(true);
      return { success: false, message: 'Network error deleting task.' };
    }
  }, [fetchTasks, refreshAll]);

  // Update Task Due Date (P1 & P2: Synced to Jira in real-time)
  const updateTaskDueDate = useCallback(async (taskId: string, dueDate: string | null) => {
    try {
      // Optimistic local update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t))
      );

      const res = await fetch('/api/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, due_date: dueDate }),
      });
      const json = await res.json();
      if (json.success) {
        await refreshAll();
        return { success: true, message: json.message || 'Deadline updated.' };
      } else {
        await fetchTasks(true);
        return { success: false, message: json.error?.message || 'Failed to update deadline.' };
      }
    } catch {
      await fetchTasks(true);
      return { success: false, message: 'Network error updating deadline.' };
    }
  }, [fetchTasks, refreshAll]);

  // Push Single Task to Jira
  const pushTaskToJira = useCallback(async (taskId: string) => {
    try {
      const res = await fetch('/api/integrations/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_item_id: taskId }),
      });
      const json = await res.json();
      if (json.success) {
        const issueKey = json.data && json.data[0]?.jira_issue_key;
        await refreshAll();
        return { success: true, jiraKey: issueKey, message: `Issue ${issueKey} created in Jira.` };
      } else {
        return { success: false, message: json.error?.message || 'Jira push failed.' };
      }
    } catch {
      return { success: false, message: 'Network error communicating with Jira Cloud.' };
    }
  }, [refreshAll]);

  // Push All Pending Tasks to Jira
  const pushAllTasksToJira = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/jira', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await refreshAll();
        return { success: true, count: json.count, message: `Successfully pushed ${json.count} task(s) to Jira.` };
      } else {
        return { success: false, message: json.error?.message || 'Jira sync failed.' };
      }
    } catch {
      return { success: false, message: 'Network error pushing tasks to Jira.' };
    }
  }, [refreshAll]);

  const addMeeting = useCallback((newMeeting: Meeting) => {
    setMeetings((prev) => {
      const filtered = prev.filter((m) => m.id !== newMeeting.id);
      return [newMeeting, ...filtered];
    });
    // Immediately trigger background refetch to ensure consistent store state
    fetchMeetings(true);
  }, [fetchMeetings]);

  const skipMeeting = useCallback(async (meetingId: string) => {
    try {
      // Optimistic update
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, status: 'skipped' as const } : m))
      );
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meetingId, status: 'skipped' }),
      });
      const json = await res.json();
      if (!json.success) {
        await fetchMeetings(true);
        return { success: false, message: json.error?.message || 'Failed to skip meeting.' };
      }
      return { success: true, message: 'Meeting marked as skipped. Bot will not join.' };
    } catch {
      await fetchMeetings(true);
      return { success: false, message: 'Network error skipping meeting.' };
    }
  }, [fetchMeetings]);

  const unskipMeeting = useCallback(async (meetingId: string) => {
    try {
      // Optimistic update
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, status: 'scheduled' as const } : m))
      );
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meetingId, status: 'scheduled' }),
      });
      const json = await res.json();
      if (!json.success) {
        await fetchMeetings(true);
        return { success: false, message: json.error?.message || 'Failed to undo.' };
      }
      return { success: true, message: 'Meeting restored.' };
    } catch {
      await fetchMeetings(true);
      return { success: false, message: 'Network error restoring meeting.' };
    }
  }, [fetchMeetings]);

  const removeMeetingLocally = useCallback((meetingId: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  }, []);

  const restoreMeetingLocally = useCallback((meeting: Meeting) => {
    setMeetings((prev) => {
      if (prev.some((m) => m.id === meeting.id)) return prev;
      return [meeting, ...prev];
    });
  }, []);

  const deleteMeetingApi = useCallback(async (meetingId: string) => {
    try {
      const res = await fetch(`/api/meetings?id=${meetingId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        await fetchMeetings(true);
      }
    } catch {
      await fetchMeetings(true);
    }
  }, [fetchMeetings]);

  const dismissMeeting = useCallback(async (meetingId: string) => {
    try {
      // Optimistic update
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      const res = await fetch(`/api/meetings?id=${meetingId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchMeetings(true);
        return { success: true, message: 'Meeting dismissed.' };
      } else {
        await fetchMeetings(true);
        return { success: false, message: json.error?.message || 'Failed to dismiss meeting.' };
      }
    } catch {
      await fetchMeetings(true);
      return { success: false, message: 'Network error dismissing meeting.' };
    }
  }, [fetchMeetings]);

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

  // Computed Metrics from Real Database State
  const upcomingMeetings = useMemo(() => {
    return meetings.filter((m) => m.status !== 'summarized' && m.status !== 'transcribed');
  }, [meetings]);

  const completedMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.status === 'summarized' || m.status === 'transcribed')
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || a.start_time || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || b.start_time || 0).getTime();
        return timeB - timeA;
      });
  }, [meetings]);

  const meetingCount = meetings.length;
  const upcomingCount = upcomingMeetings.length;
  const completedCount = completedMeetings.length;
  const taskCount = tasks.length;
  const syncedCount = tasks.filter((t) => t.status === 'synced_to_jira').length;
  const waitingCount = tasks.filter((t) => t.status !== 'synced_to_jira').length;

  // Real decision count: sum of decision_count across completed meetings
  const decisionCount = useMemo(() => {
    return completedMeetings.reduce((acc, m) => acc + (m.decision_count || 0), 0);
  }, [completedMeetings]);

  // Real time saved: completed meeting duration in hours, formatted e.g. "1.5h"
  const timeSaved = useMemo(() => {
    const totalSecs = completedMeetings.reduce((acc, m) => {
      if (m.duration_seconds && m.duration_seconds > 0) return acc + m.duration_seconds;
      if (m.start_time && m.end_time) {
        const diff = Math.max(0, (new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 1000);
        return acc + diff;
      }
      return acc + 1800; // default 30 min if unrecorded
    }, 0);
    return `${(totalSecs / 3600).toFixed(1)}h`;
  }, [completedMeetings]);

  return (
    <DashboardContext.Provider
      value={{
        meetings,
        meetingsLoading,
        syncingCalendar,
        refreshing,
        lastUpdatedText,
        dispatchingBotId,
        statusMessage,
        setStatusMessage,
        tasks,
        tasksLoading,
        meetingCount,
        upcomingCount,
        completedCount,
        taskCount,
        syncedCount,
        waitingCount,
        decisionCount,
        timeSaved,
        fetchMeetings,
        fetchTasks,
        refreshAll,
        refreshWithCalendarSync,
        syncCalendar,
        dispatchBot,
        syncBotTranscript,
        addMeeting,
        skipMeeting,
        unskipMeeting,
        dismissMeeting,
        deleteMeeting: dismissMeeting,
        removeMeetingLocally,
        restoreMeetingLocally,
        deleteMeetingApi,
        deleteTask,
        updateTaskDueDate,
        pushTaskToJira,
        pushAllTasksToJira,
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
