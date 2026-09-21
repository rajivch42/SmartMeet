// Hybrid Data Access Layer for Meetings (Supabase Postgres + In-Memory Fallback Cache)
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Meeting, MeetingStatus, Transcript, Summary, ActionItem, Reminder } from '@/types/database';
import { getFallbackDemoEvents } from './google-calendar';

// Attach to globalThis so all Next.js API routes share memory in dev mode
const globalStore = globalThis as unknown as {
  __meetingsStore?: Map<string, Meeting>;
  __transcriptsStore?: Map<string, Transcript>;
  __summariesStore?: Map<string, Summary>;
  __actionItemsStore?: Map<string, ActionItem[]>;
  __remindersStore?: Map<string, Reminder>;
};

const inMemoryMeetings = globalStore.__meetingsStore || (globalStore.__meetingsStore = new Map());
const inMemoryTranscripts = globalStore.__transcriptsStore || (globalStore.__transcriptsStore = new Map());
const inMemorySummaries = globalStore.__summariesStore || (globalStore.__summariesStore = new Map());
const inMemoryActionItems = globalStore.__actionItemsStore || (globalStore.__actionItemsStore = new Map());
const inMemoryReminders = globalStore.__remindersStore || (globalStore.__remindersStore = new Map());

// Auto-seed demo meetings and multi-state test data
export function resetAndSeedDemoState(): { meetingsCount: number; tasksCount: number } {
  inMemoryMeetings.clear();
  inMemoryTranscripts.clear();
  inMemorySummaries.clear();
  inMemoryActionItems.clear();
  inMemoryReminders.clear();

  const now = new Date();
  const m1Start = new Date(now.getTime() + 30 * 60 * 1000);
  const m1End = new Date(m1Start.getTime() + 45 * 60 * 1000);
  const m2Start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const m2End = new Date(m2Start.getTime() + 45 * 60 * 1000);
  const m3Start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const m3End = new Date(m3Start.getTime() + 30 * 60 * 1000);

  // Meeting 1: Ready to dispatch in live demo
  inMemoryMeetings.set('demo-meet-001', {
    id: 'demo-meet-001',
    user_id: 'demo-user-0000-0000-0000-000000000000',
    external_calendar_id: 'demo-meet-001',
    title: 'Sprint 24 Architecture & Schema Sync',
    meeting_url: 'https://meet.google.com/vfd-qkxz-qwe',
    start_time: m1Start.toISOString(),
    end_time: m1End.toISOString(),
    attendees: [
      { name: 'Alex Morgan', email: 'alex.morgan@company.internal' },
      { name: 'Jordan Rivera', email: 'jordan.rivera@company.internal' },
      { name: 'Sarah Chen', email: 'sarah.chen@company.internal' },
    ],
    recall_bot_id: null,
    status: 'scheduled',
    error_message: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  // Meeting 2: Fully summarized with Jira synced tasks
  inMemoryMeetings.set('demo-meet-002', {
    id: 'demo-meet-002',
    user_id: 'demo-user-0000-0000-0000-000000000000',
    external_calendar_id: 'demo-meet-002',
    title: 'Q3 Infrastructure & Jira Alignment',
    meeting_url: 'https://meet.google.com/mno-pwqd-zxc',
    start_time: m2Start.toISOString(),
    end_time: m2End.toISOString(),
    attendees: [
      { name: 'Engineering Lead', email: 'lead@company.internal' },
      { name: 'Alex Morgan', email: 'alex.morgan@company.internal' },
    ],
    recall_bot_id: 'bot-recall-seeded-002',
    status: 'summarized',
    error_message: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  inMemorySummaries.set('demo-meet-002', {
    id: 'sum-demo-002',
    meeting_id: 'demo-meet-002',
    executive_summary: 'The infrastructure team finalized Kubernetes pod scaling policies and aligned Jira project issue types for sprint delivery.',
    decisions: [
      'Standardize all deployment pipelines onto GitHub Actions with automated Jira issue tracking.',
      'Enforce zero-downtime rolling updates on Kubernetes clusters.',
    ],
    discussion_points: [
      { topic: 'Deployment Automation', summary: 'Agreed to phase out legacy Jenkins jobs in favor of GitHub Actions workflows.' },
      { topic: 'Jira Key Synchronization', summary: 'Configured automated webhook callbacks to transition issues to In Progress.' },
    ],
    model_version: 'claude-3-5-sonnet-20240620',
    created_at: now.toISOString(),
  });

  inMemoryActionItems.set('demo-meet-002', [
    {
      id: 'task-seed-001',
      meeting_id: 'demo-meet-002',
      title: 'Migrate CI pipeline to GitHub Actions',
      description: 'Replace legacy Jenkins runner with GitHub Actions workflow.',
      assignee_name: 'Alex Morgan',
      assignee_email: 'alex.morgan@company.internal',
      due_date: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
      status: 'synced_to_jira',
      jira_issue_key: 'ENG-103',
      jira_issue_url: 'https://company.atlassian.net/browse/ENG-103',
      synced_at: now.toISOString(),
      created_at: now.toISOString(),
    },
  ]);

  // Meeting 3: Transcribed, ready to test "Generate AI Summary"
  inMemoryMeetings.set('demo-meet-003', {
    id: 'demo-meet-003',
    user_id: 'demo-user-0000-0000-0000-000000000000',
    external_calendar_id: 'demo-meet-003',
    title: 'API Security & OAuth Review',
    meeting_url: 'https://meet.google.com/ert-tyui-opq',
    start_time: m3Start.toISOString(),
    end_time: m3End.toISOString(),
    attendees: [
      { name: 'Security Auditor', email: 'security@company.internal' },
      { name: 'Sarah Chen', email: 'sarah.chen@company.internal' },
    ],
    recall_bot_id: 'bot-recall-seeded-003',
    status: 'transcribed',
    error_message: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  inMemoryTranscripts.set('demo-meet-003', {
    id: 'tr-demo-003',
    meeting_id: 'demo-meet-003',
    raw_text: '[00:02] Security Auditor: Welcome everyone. We are conducting a review of our OAuth tokens.\n[00:15] Sarah Chen: I have updated the refresh token rotation policy to expire every 30 days.\n[00:30] Security Auditor: Excellent. Please ensure strict rate limiting on /oauth/token endpoint.',
    duration_seconds: 32,
    language: 'en',
    created_at: now.toISOString(),
  });

  return { meetingsCount: inMemoryMeetings.size, tasksCount: 1 };
}

// Only seed on startup if running in pure offline mock demo mode
if (isPlaceholderConfig() && inMemoryMeetings.size === 0) {
  resetAndSeedDemoState();
}

export function clearInMemoryDemoMeetings() {
  for (const [key, m] of inMemoryMeetings.entries()) {
    if (key.startsWith('demo-') || m.external_calendar_id?.startsWith('demo-')) {
      inMemoryMeetings.delete(key);
    }
  }
}

function isPlaceholderConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('placeholder-project') || url.includes('your-project');
}

/**
 * Persists or updates meetings, preferring Supabase with transparent in-memory fallback.
 */
export async function upsertMeetings(meetings: Partial<Meeting>[]): Promise<Meeting[]> {
  const saved: Meeting[] = [];

  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();

      const admin = createAdminClient();

      if (!user) {
        const passedUserId = meetings.find((m) => m.user_id)?.user_id;
        if (passedUserId) {
          user = { id: passedUserId } as any;
        } else {
          const { data: intg } = await admin
            .from('integrations')
            .select('user_id')
            .eq('provider', 'google_calendar')
            .maybeSingle();
          if (intg?.user_id) {
            user = { id: intg.user_id } as any;
          }
        }
      }

      const userId = user?.id || 'demo-user-0000-0000-0000-000000000000';

      for (const m of meetings) {
        const meetingPayload = {
          user_id: userId,
          external_calendar_id: m.external_calendar_id || null,
          title: m.title || 'Untitled Meeting',
          meeting_url: m.meeting_url || '',
          start_time: m.start_time || new Date().toISOString(),
          end_time: m.end_time || new Date().toISOString(),
          attendees: JSON.stringify(m.attendees || []),
          status: (m.status as MeetingStatus) || 'scheduled',
          updated_at: new Date().toISOString(),
        };

        let existingId: string | null = m.id || null;

        if (!existingId && m.external_calendar_id) {
          const { data: existing } = await admin
            .from('meetings')
            .select('id')
            .eq('user_id', userId)
            .eq('external_calendar_id', m.external_calendar_id)
            .maybeSingle();
          if (existing?.id) {
            existingId = existing.id;
          }
        }

        let resultRecord = null;
        if (existingId) {
          const { data, error } = await admin
            .from('meetings')
            .update(meetingPayload)
            .eq('id', existingId)
            .select()
            .single();
          if (data && !error) resultRecord = data;
        } else {
          const { data, error } = await admin
            .from('meetings')
            .insert(meetingPayload)
            .select()
            .single();
          if (data && !error) resultRecord = data;
        }

        if (resultRecord) {
          const rec: Meeting = {
            ...resultRecord,
            attendees: typeof resultRecord.attendees === 'string' ? JSON.parse(resultRecord.attendees) : resultRecord.attendees,
          };
          saved.push(rec);
          inMemoryMeetings.set(rec.id, rec);
        }
      }

      if (saved.length > 0) return saved;
    } catch (err) {
      console.warn('[MEETING_STORE] Supabase meeting save error, falling back to local memory store:', err);
    }
  }

  // Fallback in-memory store
  for (const m of meetings) {
    const id = m.id || m.external_calendar_id || `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: Meeting = {
      id,
      user_id: m.user_id || 'demo-user-0000-0000-0000-000000000000',
      external_calendar_id: m.external_calendar_id || null,
      title: m.title || 'Untitled Meeting',
      meeting_url: m.meeting_url || 'https://meet.google.com/demo-room',
      start_time: m.start_time || new Date().toISOString(),
      end_time: m.end_time || new Date(Date.now() + 30 * 60000).toISOString(),
      attendees: m.attendees || [],
      recall_bot_id: m.recall_bot_id || null,
      status: (m.status as MeetingStatus) || 'scheduled',
      error_message: m.error_message || null,
      created_at: m.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryMeetings.set(id, record);
    saved.push(record);
  }

  return saved;
}

/**
 * Updates meeting status and optional bot ID.
 */
export async function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus,
  recallBotId?: string,
  errorMessage?: string
): Promise<Meeting | null> {
  const existing = inMemoryMeetings.get(meetingId);
  if (existing) {
    existing.status = status;
    if (recallBotId) existing.recall_bot_id = recallBotId;
    if (errorMessage) existing.error_message = errorMessage;
    existing.updated_at = new Date().toISOString();
    inMemoryMeetings.set(meetingId, existing);
  }

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (recallBotId) updates.recall_bot_id = recallBotId;
      if (errorMessage) updates.error_message = errorMessage;

      const { data } = await admin
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();

      if (data) {
        return {
          ...data,
          attendees: typeof data.attendees === 'string' ? JSON.parse(data.attendees) : data.attendees,
        };
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error updating meeting status in Supabase:', err);
    }
  }

  return inMemoryMeetings.get(meetingId) || null;
}

export async function getMeetingsList(): Promise<Meeting[]> {
  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();

      const admin = createAdminClient();

      // If user session cookie not present, resolve active user from integrations
      if (!user) {
        const { data: intg } = await admin
          .from('integrations')
          .select('user_id')
          .eq('provider', 'google_calendar')
          .maybeSingle();
        if (intg?.user_id) {
          user = { id: intg.user_id } as any;
        }
      }

      if (user) {
        const { data, error } = await admin
          .from('meetings')
          .select('*, summaries(decisions), action_items(id, jira_issue_key, status), transcripts(duration_seconds)')
          .eq('user_id', user.id)
          .or('external_calendar_id.is.null,external_calendar_id.not.like.demo-meet%')
          .order('start_time', { ascending: true });

        if (!error && data) {
          return data.map((item: any) => {
            let decisionCount = 0;
            if (item.summaries && item.summaries.length > 0 && item.summaries[0]?.decisions) {
              const rawDecisions = item.summaries[0].decisions;
              const parsed = typeof rawDecisions === 'string'
                ? (() => { try { return JSON.parse(rawDecisions); } catch { return []; } })()
                : rawDecisions;
              decisionCount = Array.isArray(parsed) ? parsed.length : 0;
            }

            const actionItemsList = Array.isArray(item.action_items) ? item.action_items : [];
            const tasksCount = actionItemsList.length;
            const jiraTasksCount = actionItemsList.filter((a: any) => a.jira_issue_key).length;

            const transcriptsList = Array.isArray(item.transcripts) ? item.transcripts : [];
            const durationSecs = transcriptsList.length > 0 && transcriptsList[0]?.duration_seconds != null
              ? transcriptsList[0].duration_seconds
              : null;

            return {
              ...item,
              attendees: typeof item.attendees === 'string' ? JSON.parse(item.attendees) : item.attendees,
              decision_count: decisionCount,
              tasks_count: tasksCount,
              jira_tasks_count: jiraTasksCount,
              duration_seconds: durationSecs,
            };
          });
        }
        return [];
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error querying Supabase:', err);
    }
  }

  // Only fallback to demo seed if running in pure offline mock demo mode (no Supabase configured)
  if (isPlaceholderConfig()) {
    if (inMemoryMeetings.size === 0) {
      resetAndSeedDemoState();
    }
    return Array.from(inMemoryMeetings.values()).map((m) => {
      const s = inMemorySummaries.get(m.id);
      const acts = inMemoryActionItems.get(m.id) || [];
      const tr = inMemoryTranscripts.get(m.id);
      return {
        ...m,
        decision_count: s?.decisions?.length || 0,
        tasks_count: acts.length,
        jira_tasks_count: acts.filter((a: ActionItem) => a.jira_issue_key).length,
        duration_seconds: tr?.duration_seconds || null,
      };
    }).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }

  return [];
}

/**
 * Gets a single meeting by its ID.
 */
export async function getMeetingById(id: string): Promise<Meeting | null> {
  if (inMemoryMeetings.size === 0) {
    resetAndSeedDemoState();
  }

  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          ...data,
          attendees: typeof data.attendees === 'string' ? JSON.parse(data.attendees) : data.attendees,
        };
      }

      // Backend fallback: if cookies don't contain auth session, query using admin client
      const admin = createAdminClient();
      const adminRes = await admin
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (!adminRes.error && adminRes.data) {
        return {
          ...adminRes.data,
          attendees: typeof adminRes.data.attendees === 'string' ? JSON.parse(adminRes.data.attendees) : adminRes.data.attendees,
        };
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Supabase lookup error, checking memory:', err);
    }
  }

  return inMemoryMeetings.get(id) || null;
}

/**
 * Saves a transcript for a meeting.
 */
export async function saveTranscript(transcript: Partial<Transcript>): Promise<Transcript> {
  const id = transcript.id || `tr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record: Transcript = {
    id,
    meeting_id: transcript.meeting_id!,
    raw_text: transcript.raw_text || '',
    speakers: transcript.speakers || [],
    duration_seconds: transcript.duration_seconds || 0,
    created_at: transcript.created_at || new Date().toISOString(),
  };

  inMemoryTranscripts.set(record.meeting_id, record);

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('transcripts')
        .insert({
          meeting_id: record.meeting_id,
          raw_text: record.raw_text,
          speakers: JSON.stringify(record.speakers),
          duration_seconds: record.duration_seconds,
        })
        .select()
        .single();

      if (data) {
        return {
          ...data,
          speakers: typeof data.speakers === 'string' ? JSON.parse(data.speakers) : data.speakers,
        };
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error saving transcript to Supabase:', err);
    }
  }

  return record;
}

/**
 * Retrieves a meeting's transcript by meeting ID.
 */
export async function getTranscriptByMeetingId(meetingId: string): Promise<Transcript | null> {
  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return {
          ...data,
          speakers: typeof data.speakers === 'string' ? JSON.parse(data.speakers) : data.speakers,
        };
      }

      // Backend fallback: if cookies don't contain auth session, query using admin client
      const admin = createAdminClient();
      const adminRes = await admin
        .from('transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!adminRes.error && adminRes.data) {
        return {
          ...adminRes.data,
          speakers: typeof adminRes.data.speakers === 'string' ? JSON.parse(adminRes.data.speakers) : adminRes.data.speakers,
        };
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error reading transcript from Supabase:', err);
    }
  }

  return inMemoryTranscripts.get(meetingId) || null;
}

/**
 * Saves or replaces the AI summary for a meeting.
 */
export async function saveSummary(summary: Partial<Summary>): Promise<Summary> {
  const id = summary.id || `sum-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record: Summary = {
    id,
    meeting_id: summary.meeting_id!,
    executive_summary: summary.executive_summary || '',
    decisions: summary.decisions || [],
    discussion_points: summary.discussion_points || [],
    model_version: summary.model_version || 'claude-3-5-sonnet',
    created_at: summary.created_at || new Date().toISOString(),
  };

  inMemorySummaries.set(record.meeting_id, record);

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const payload = {
        meeting_id: record.meeting_id,
        executive_summary: record.executive_summary,
        decisions: JSON.stringify(record.decisions),
        discussion_points: JSON.stringify(record.discussion_points),
        model_version: record.model_version,
      };

      const { data: existing } = await admin
        .from('summaries')
        .select('id')
        .eq('meeting_id', record.meeting_id)
        .maybeSingle();

      let resultRecord = null;
      if (existing?.id) {
        const { data, error } = await admin
          .from('summaries')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (data && !error) resultRecord = data;
      } else {
        const { data, error } = await admin
          .from('summaries')
          .insert(payload)
          .select()
          .single();
        if (data && !error) resultRecord = data;
      }

      if (resultRecord) {
        return {
          ...resultRecord,
          decisions: typeof resultRecord.decisions === 'string' ? JSON.parse(resultRecord.decisions) : resultRecord.decisions,
          discussion_points: typeof resultRecord.discussion_points === 'string' ? JSON.parse(resultRecord.discussion_points) : resultRecord.discussion_points,
        };
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error saving summary to Supabase:', err);
    }
  }

  return record;
}

/**
 * Retrieves the AI summary for a meeting.
 */
export async function getSummaryByMeetingId(meetingId: string): Promise<Summary | null> {
  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return {
          ...data,
          decisions: typeof data.decisions === 'string' ? JSON.parse(data.decisions) : data.decisions,
          discussion_points: typeof data.discussion_points === 'string' ? JSON.parse(data.discussion_points) : data.discussion_points,
        };
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error reading summary from Supabase:', err);
    }
  }

  return inMemorySummaries.get(meetingId) || null;
}

/**
 * Saves extracted action items for a meeting.
 */
export async function saveActionItems(
  meetingId: string,
  items: Partial<ActionItem>[]
): Promise<ActionItem[]> {
  const savedList: ActionItem[] = [];

  for (const item of items) {
    const id = item.id || `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: ActionItem = {
      id,
      meeting_id: meetingId,
      title: item.title || 'Untitled Action Item',
      description: item.description || null,
      assignee_name: item.assignee_name || null,
      assignee_email: item.assignee_email || null,
      due_date: item.due_date || null,
      priority: item.priority || 'medium',
      status: item.status || 'pending',
      jira_issue_key: item.jira_issue_key || null,
      jira_issue_url: item.jira_issue_url || null,
      synced_at: item.synced_at || null,
      created_at: item.created_at || new Date().toISOString(),
    };
    savedList.push(record);
  }

  inMemoryActionItems.set(meetingId, savedList);

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('action_items')
        .insert(
          savedList.map((item) => ({
            meeting_id: item.meeting_id,
            title: item.title,
            description: item.description,
            assignee_name: item.assignee_name,
            assignee_email: item.assignee_email,
            due_date: item.due_date,
            priority: item.priority,
            status: item.status,
            jira_issue_key: item.jira_issue_key,
            jira_issue_url: item.jira_issue_url,
          }))
        )
        .select();

      if (data && data.length > 0) {
        return data as ActionItem[];
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error saving action items to Supabase:', err);
    }
  }

  return savedList;
}

/**
 * Retrieves action items for a meeting.
 */
export async function getActionItemsByMeetingId(meetingId: string): Promise<ActionItem[]> {
  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as ActionItem[];
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error querying action items from Supabase:', err);
    }
  }

  return inMemoryActionItems.get(meetingId) || [];
}

export async function getAllActionItems(): Promise<ActionItem[]> {
  if (!isPlaceholderConfig()) {
    try {
      const supabase = createServerSupabaseClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();

      const admin = createAdminClient();

      if (!user) {
        const { data: intg } = await admin
          .from('integrations')
          .select('user_id')
          .eq('provider', 'google_calendar')
          .maybeSingle();
        if (intg?.user_id) {
          user = { id: intg.user_id } as any;
        }
      }

      if (user) {
        // Query only action items belonging to this user's meetings
        const { data: userMeetings } = await admin
          .from('meetings')
          .select('id')
          .eq('user_id', user.id);

        const meetingIds = (userMeetings || []).map((m) => m.id);
        if (meetingIds.length === 0) {
          return [];
        }

        const { data, error } = await admin
          .from('action_items')
          .select('*')
          .in('meeting_id', meetingIds)
          .order('due_date', { ascending: true });

        if (!error && data) {
          return data as ActionItem[];
        }
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error querying all action items:', err);
    }
  }

  // Only fallback to demo tasks if in offline mock demo mode
  if (isPlaceholderConfig()) {
    const all: ActionItem[] = [];
    Array.from(inMemoryActionItems.values()).forEach((list) => {
      all.push(...list);
    });
    return all;
  }

  return [];
}

/**
 * Updates Jira issue reference and status for an action item.
 */
export async function updateActionItemJira(
  actionItemId: string,
  jiraIssueKey: string,
  jiraIssueUrl: string
): Promise<ActionItem | null> {
  let updatedItem: ActionItem | null = null;

  Array.from(inMemoryActionItems.entries()).forEach(([mId, list]) => {
    const item = (list as ActionItem[]).find((a: ActionItem) => a.id === actionItemId);
    if (item) {
      item.jira_issue_key = jiraIssueKey;
      item.jira_issue_url = jiraIssueUrl;
      item.status = 'synced_to_jira';
      item.synced_at = new Date().toISOString();
      updatedItem = item;
      inMemoryActionItems.set(mId, list);
    }
  });

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('action_items')
        .update({
          jira_issue_key: jiraIssueKey,
          jira_issue_url: jiraIssueUrl,
          status: 'synced_to_jira',
          synced_at: new Date().toISOString(),
        })
        .eq('id', actionItemId)
        .select()
        .single();

      if (data) {
        return data as ActionItem;
      }
    } catch (err) {
      console.warn('[MEETING_STORE] Error updating action item Jira key in Supabase:', err);
    }
  }

  return updatedItem;
}

export async function deleteActionItem(actionItemId: string): Promise<boolean> {
  Array.from(inMemoryActionItems.entries()).forEach(([mId, list]) => {
    const updated = (list as ActionItem[]).filter((a) => a.id !== actionItemId);
    inMemoryActionItems.set(mId, updated);
  });

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      await admin.from('reminders').delete().eq('action_item_id', actionItemId);
      await admin.from('action_items').delete().eq('id', actionItemId);
      return true;
    } catch (err) {
      console.warn('[MEETING_STORE] Error deleting action item from Supabase:', err);
    }
  }
  return true;
}

/**
 * Saves a reminder record.
 */
export async function saveReminder(reminder: Partial<Reminder>): Promise<Reminder> {
  const id = reminder.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record: Reminder = {
    id,
    action_item_id: reminder.action_item_id!,
    recipient_email: reminder.recipient_email || 'attendee@company.internal',
    scheduled_for: reminder.scheduled_for || new Date().toISOString(),
    sent_at: reminder.sent_at || new Date().toISOString(),
    status: reminder.status || 'sent',
    channel: reminder.channel || 'slack',
    created_at: reminder.created_at || new Date().toISOString(),
  };

  inMemoryReminders.set(record.id, record);

  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('reminders')
        .insert({
          action_item_id: record.action_item_id,
          recipient_email: record.recipient_email,
          scheduled_for: record.scheduled_for,
          sent_at: record.sent_at,
          status: record.status,
          channel: record.channel,
        })
        .select()
        .single();

      if (data) return data as Reminder;
    } catch (err) {
      console.warn('[MEETING_STORE] Error saving reminder to Supabase:', err);
    }
  }

  return record;
}

/**
 * Retrieves all sent reminders.
 */
export async function getAllReminders(): Promise<Reminder[]> {
  if (!isPlaceholderConfig()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('reminders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) return data as Reminder[];
    } catch (err) {
      console.warn('[MEETING_STORE] Error reading reminders from Supabase:', err);
    }
  }

  return Array.from(inMemoryReminders.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}


