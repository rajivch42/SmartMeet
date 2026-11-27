# Engineering Guidelines & Project Rules
## AI Meeting Assistant Platform

---

### 1. Libraries & Architectural Approaches: What to USE vs. AVOID

| Category | Standard to USE | Anti-Pattern to AVOID | Rationale |
| :--- | :--- | :--- | :--- |
| **Authentication** | **Supabase Auth** (`@supabase/ssr`, `@supabase/supabase-js`) | **Custom JWT/Session Engine or NextAuth v4** | Supabase Auth provides bulletproof Google OAuth, session cookies for Server Components, and direct integration with Postgres Row-Level Security without writing custom cryptographic session managers. |
| **Meeting Capture** | **Dual Engine: Recall.ai (Google Meet) + Native WebRTC Studio (`/meet/[id]`)** | **Custom Puppeteer/Playwright headless bots scraping Google Meet** | Google actively detects and blocks unauthenticated headless Chromium bots (`You can't join this video call`). Standard calls use Recall.ai, while in-app meetings run on native WebRTC mesh with Supabase Realtime broadcast signaling. |
| **Speech-to-Text** | **Browser SpeechRecognition (<200ms) + Recall.ai Diarization** | **Complex custom audio streaming pipelines** | Browser Web Speech API provides sub-second live typing feedback, auto-finalized with a 1.2s silence detector. Recall.ai delivers complete webhook transcripts for scheduled external calls. |
| **AI Summarization** | **Google Gemini 2.5 Flash (`@google/genai`) / Claude 3.5 / GPT-4o** | **Unstructured or unbounded prompt output** | Strict Zod validation and structured JSON mode are enforced across all model calls to guarantee valid Decision, Discussion, and Action Item extractions. |
| **Styling** | **Vanilla CSS + CSS Modules** | **Tailwind CSS (unless explicitly requested) or heavy UI kits (MUI)** | Ensures complete control over design tokens, glassmorphic styling, zero CSS build friction, lightweight bundle size, and crisp visual hierarchy without class bloat. |
| **State Management** | **React Server Components (RSC) + React 18 `useState` / `useTransition`** | **Redux, MobX, or Complex State Machines** | The application is predominantly document- and table-driven. Server components handle data fetching; client components handle local interactive state (e.g. tabs, drawers, search inputs). |
| **Validation** | **Zod** (`zod`) | **Unchecked `as any` type assertions** | External webhook payloads and LLM JSON outputs must be parsed through strict Zod schemas to prevent runtime crashes during presentations. |

---

### 2. Error Handling & Demo Resilience Philosophy

For a multi-week college project presentation, **demo reliability and fault tolerance trump exhaustive edge-case recovery**. The application must never present an unhandled white screen of death or an unhandled 500 error.

1. **Independent Pipeline Isolation**:
   - The post-meeting pipeline is decoupled into discrete stages:
     `Ingest Transcript` -> `LLM Summarize` -> `Create Jira Tasks` -> `Post Slack Notification`.
   - **Rule**: If the Slack webhook fails (e.g., channel deleted or rate limit), the Jira issue creation and database summary storage **must still succeed**.
   - **Rule**: If Jira API token is invalid, the meeting summary and transcript view must still render cleanly on the dashboard with a visible warning: *"Jira sync failed: Check API credentials in Settings"*, alongside a manual **"Retry Jira Sync"** button.

2. **Unified API Route Response Envelope**:
   All internal API routes (`/api/*`) must return a predictable JSON envelope:
   ```typescript
   export type ApiResponse<T> = {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: unknown;
     };
   };
   ```

3. **Defensive External API Calls**:
   Every HTTP request to an external provider (Google, Recall.ai, Anthropic/OpenAI, Slack, Jira) must be wrapped in a `try/catch` block with explicit timeout configurations (e.g. `AbortController` timeout of 15 seconds) and structured console logging:
   ```typescript
   console.error(`[SERVICE_ERROR] ${serviceName}.${operation}:`, {
     status: error.status,
     message: error.message,
   });
   ```

---

### 3. Secrets & Environment Variable Rules

1. **Strict Git Exclusion**:
   - Secrets must never be committed to source control. `.env.local` is permanently included in `.gitignore`.
   - A complete `.env.example` file must be maintained with descriptive dummy values and comments detailing where to obtain each key.
2. **Server vs. Client Boundary Isolation**:
   - **NEVER** prefix sensitive API keys with `NEXT_PUBLIC_`.
   - The following keys must **ONLY** be accessed in server environments (API Route Handlers, Server Actions, or `lib/services/*`):
     - `GEMINI_API_KEY`
     - `RECALL_AI_API_KEY`
     - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
     - `JIRA_API_TOKEN`
     - `SLACK_WEBHOOK_URL` / `SLACK_BOT_TOKEN`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GOOGLE_CLIENT_SECRET`
   - Only non-sensitive keys may use `NEXT_PUBLIC_`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_APP_URL`

---

### 4. Code Style, TypeScript & Engineering Conventions

1. **TypeScript Strict Mode**:
   - `tsconfig.json` must enforce `"strict": true`, `"noImplicitAny": true`, and `"strictNullChecks": true`.
   - No usage of `any` except for temporary generic utility wrappers. All data entities (Meetings, Transcripts, Summaries, Action Items) must have explicit TypeScript interface definitions under `src/types/`.
2. **Naming Conventions**:
   - **Components**: PascalCase (e.g., `TranscriptViewer.tsx`, `MeetingCard.tsx`).
   - **Hooks & Utilities**: camelCase (e.g., `useMeetingRealtime.ts`, `formatDuration.ts`).
   - **API Routes & Directories**: kebab-case (e.g., `api/calendar/sync/route.ts`).
   - **Constants & Environment Variables**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_BOT_NAME`, `MAX_RETRIES`).
   - **Database Tables & Columns**: snake_case (e.g., `meeting_url`, `transcript_chunks`).
3. **Commentary & Documentation**:
   - Every integration service module in `src/lib/services/` must contain JSDoc documentation detailing:
     - Expected input payload.
     - External API endpoint called.
     - Possible HTTP status codes and fallback behavior.

---

### 5. Explicit Constraints: What the AI & Engineers Must NOT Do

1. **DO NOT invent fictitious API endpoints**:
   - Every API call must adhere strictly to published documentation:
     - Recall.ai: `POST https://api.recall.ai/api/v1/bot/`
     - Jira Cloud: `POST https://{domain}.atlassian.net/rest/api/3/issue` (using Atlassian Document Format for descriptions).
     - Google Calendar: `GET https://www.googleapis.com/calendar/v3/calendars/primary/events`
     - Slack: Standard Webhook POST with `{ text: string, blocks?: Array }`.
2. **DO NOT bypass or mock authentication in core flows**:
   - Do not replace Supabase authentication with a hardcoded `const currentUser = { id: '123' }` in production routes. Every user-facing action must resolve the active session from Supabase SSR cookies.
3. **DO NOT silently swallow errors**:
   - Never write empty catch blocks (`catch (e) {}`). All caught exceptions must either be converted into an `ApiResponse` error structure or logged with context.
4. **DO NOT over-engineer Phase 1 scope**:
   - Do not introduce message queues (RabbitMQ/Kafka), Redis caches, or complex microservices. Next.js serverless route handlers and Supabase PostgreSQL are sufficient for the MVP.
5. **DO NOT build Phase 2 "Anonymous Peer-Help" code**:
   - Do not create routes, components, or active tables for the peer-help module. The database migration will leave a commented architectural schema block only.
6. **DO NOT rely on client-side timers for critical meeting joins**:
   - Meeting joins and reminders must rely on server-side timestamps and webhook events, not browser `setTimeout` loops that fail when a user closes their tab.
