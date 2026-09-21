-- 00001_initial_schema.sql
-- AutoSync Meet Initial Database Schema for PostgreSQL / Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to auto-create public.profiles record when new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. INTEGRATIONS (Store OAuth tokens & integration configs)
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google_calendar' | 'slack' | 'jira'
    access_token TEXT,
    refresh_token TEXT,
    webhook_url TEXT,
    jira_domain TEXT,
    jira_project_key TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integrations"
    ON public.integrations FOR ALL
    USING (auth.uid() = user_id);

-- 3. MEETINGS
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_calendar_id TEXT,
    title TEXT NOT NULL,
    meeting_url TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    attendees JSONB DEFAULT '[]'::jsonb,
    recall_bot_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'scheduled',
    -- 'scheduled' | 'bot_dispatched' | 'in_progress' | 'transcribed' | 'summarized' | 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own meetings"
    ON public.meetings FOR ALL
    USING (auth.uid() = user_id);

-- 4. TRANSCRIPTS (Diarized transcript text)
CREATE TABLE IF NOT EXISTS public.transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    speakers JSONB DEFAULT '[]'::jsonb,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transcripts of their own meetings"
    ON public.transcripts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcripts.meeting_id AND m.user_id = auth.uid()
        )
    );

-- 5. SUMMARIES (Decisions & discussion notes)
CREATE TABLE IF NOT EXISTS public.summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    executive_summary TEXT NOT NULL,
    decisions JSONB DEFAULT '[]'::jsonb,
    discussion_points JSONB DEFAULT '[]'::jsonb,
    model_version TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view summaries of their own meetings"
    ON public.summaries FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = summaries.meeting_id AND m.user_id = auth.uid()
        )
    );

-- 6. ACTION ITEMS (Syncable to Jira)
CREATE TABLE IF NOT EXISTS public.action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee_name TEXT,
    assignee_email TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
    status TEXT DEFAULT 'pending', -- 'pending' | 'synced_to_jira' | 'completed'
    jira_issue_key TEXT,
    jira_issue_url TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage action items for their meetings"
    ON public.action_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = action_items.meeting_id AND m.user_id = auth.uid()
        )
    );

-- 7. REMINDERS
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_item_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled', -- 'scheduled' | 'sent' | 'cancelled'
    channel TEXT DEFAULT 'slack', -- 'slack' | 'email' | 'in_app'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders for their action items"
    ON public.reminders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.action_items a
            JOIN public.meetings m ON m.id = a.meeting_id
            WHERE a.id = reminders.action_item_id AND m.user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON public.action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON public.action_items(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON public.transcripts(meeting_id);
