// Database types matching Supabase PostgreSQL schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationProvider = 'google_calendar' | 'slack' | 'jira';

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  access_token: string | null;
  refresh_token: string | null;
  webhook_url: string | null;
  jira_domain: string | null;
  jira_project_key: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MeetingStatus =
  | 'scheduled'
  | 'bot_dispatched'
  | 'in_progress'
  | 'transcribed'
  | 'summarized'
  | 'failed';

export interface MeetingAttendee {
  name?: string;
  email: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  external_calendar_id: string | null;
  title: string;
  meeting_url: string;
  start_time: string;
  end_time: string;
  attendees: MeetingAttendee[];
  recall_bot_id: string | null;
  status: MeetingStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  decision_count?: number;
  tasks_count?: number;
  jira_tasks_count?: number;
  duration_seconds?: number | null;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  raw_text: string;
  speakers: string[];
  duration_seconds: number;
  created_at: string;
}

export interface TranscriptChunk {
  id: string;
  transcript_id: string;
  meeting_id: string;
  speaker_name: string | null;
  start_time_offset: number;
  end_time_offset: number;
  chunk_text: string;
  similarity?: number;
  created_at: string;
}

export interface DiscussionPoint {
  topic: string;
  summary: string;
}

export interface Summary {
  id: string;
  meeting_id: string;
  executive_summary: string;
  decisions: string[];
  discussion_points: DiscussionPoint[];
  model_version: string;
  created_at: string;
}

export type ActionItemPriority = 'low' | 'medium' | 'high';
export type ActionItemStatus = 'pending' | 'synced_to_jira' | 'completed';

export interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  due_date: string | null;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  jira_issue_key: string | null;
  jira_issue_url: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  action_item_id: string;
  recipient_email: string;
  scheduled_for: string;
  sent_at: string | null;
  status: 'scheduled' | 'sent' | 'cancelled';
  channel: 'slack' | 'email' | 'in_app';
  created_at: string;
}
