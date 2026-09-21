-- 00002_vector_search.sql
-- Vector search support with pgvector for AutoSync Meet

CREATE EXTENSION IF NOT EXISTS "vector";

-- Table to store transcript chunks for semantic retrieval
CREATE TABLE IF NOT EXISTS public.transcript_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    speaker_name TEXT,
    start_time_offset NUMERIC(8, 2), -- seconds from start of meeting
    end_time_offset NUMERIC(8, 2),
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- Standard dimension for OpenAI / Claude compatible embeddings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks for their meetings"
    ON public.transcript_chunks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcript_chunks.meeting_id AND m.user_id = auth.uid()
        )
    );

-- HNSW cosine distance index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_embedding
    ON public.transcript_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_transcript_chunks_meeting_id
    ON public.transcript_chunks(meeting_id);

-- PostgreSQL function for similarity search across a user's meetings
CREATE OR REPLACE FUNCTION public.match_transcript_chunks (
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_meeting_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    meeting_id uuid,
    speaker_name text,
    start_time_offset numeric,
    end_time_offset numeric,
    chunk_text text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc.meeting_id,
        tc.speaker_name,
        tc.start_time_offset,
        tc.end_time_offset,
        tc.chunk_text,
        1 - (tc.embedding <=> query_embedding) AS similarity
    FROM public.transcript_chunks tc
    JOIN public.meetings m ON m.id = tc.meeting_id
    WHERE (filter_meeting_id IS NULL OR tc.meeting_id = filter_meeting_id)
      AND (m.user_id = auth.uid())
      AND 1 - (tc.embedding <=> query_embedding) > match_threshold
    ORDER BY tc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
