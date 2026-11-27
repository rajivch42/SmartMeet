# AutoSync Meet: AI-Powered Meeting Assistant Platform
> **Automated Meeting Bot, Diarized Transcription, AI Summarization, Slack Broadcasting, Jira Issue Synchronization, and Conversational Q&A.**

---

## 1. Project Overview

**AutoSync Meet** is an end-to-end meeting intelligence platform built for modern engineering and product teams. It solves the critical corporate pain point where key strategic decisions and verbal task assignments made during meetings are lost or inconsistently tracked.

By integrating directly with **Google Calendar**, **Recall.ai**, **Anthropic Claude / OpenAI**, **Slack**, and **Jira Cloud**, the platform automatically:
1. Detects upcoming calls and deploys an autonomous meeting bot to record and transcribe audio.
2. Synthesizes unstructured meeting transcripts into actionable intelligence (Decisions Made, Discussion Points, and Action Items).
3. Posts structured meeting summaries to Slack within minutes of call conclusion.
4. Auto-generates Jira tickets for action items with assigned owners and deadlines.
5. Sends periodic reminders for pending deliverables.
6. Provides a semantic Q&A retrieval engine allowing team members to query past discussions in natural language.

---

## 2. Planning Documents Index

This folder contains the complete suite of architecture, specification, and runbook documentation for the platform:

| Document | File Link | Primary Purpose |
| :--- | :--- | :--- |
| **Project Requirements Document** | [`PRD.md`](./PRD.md) | Problem statement, target personas, MVP goals, non-goals, Phase 1 user stories, and presentation success criteria. |
| **System Architecture** | [`Architecture.md`](./Architecture.md) | End-to-end data flow with sequence diagrams, In-App WebRTC Studio architecture, tech stack breakdown, and database schema. |
| **Engineering Rules & Conventions** | [`Rules.md`](./Rules.md) | Approved libraries vs. anti-patterns, demo-first resilience philosophy, secrets isolation, TypeScript standards, and strict constraints. |
| **Implementation Phases** | [`Phases.md`](./Phases.md) | Sequential milestones (Phase 0 to 6), detailing deliverables, tasks, and "Done When" verification gates. |
| **Design System & UI Specs** | [`Design.md`](./Design.md) | High-trust corporate SaaS aesthetic, CSS design tokens, color palette, typography hierarchy, and wireframes. |
| **Presentation Runbook** | [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md) | 7-minute minute-by-minute speaking script, click instructions, and technical Q&A defense answers for evaluators. |
| **Progress Memory Log** | [`Memory.md`](./Memory.md) | Chronological progress log, verified milestones, architectural decisions, and current deployment status. |
| **System Memory Specification** | [`PROJECT_ARCHITECTURE_AND_SYSTEM_SUMMARY.md`](./PROJECT_ARCHITECTURE_AND_SYSTEM_SUMMARY.md) | Deep-dive system architecture, calendar hygiene filters, and workflow definitions. |
| **Self-Hosted Bot Feasibility** | [`OWN_BOT_WORKER_FEASIBILITY_AND_BLUEPRINT.md`](./OWN_BOT_WORKER_FEASIBILITY_AND_BLUEPRINT.md) | Technical blueprint and feasibility analysis for custom Playwright bot workers. |

---

## 3. High-Level Technology Stack

* **Frontend & Backend**: Next.js 14+ (App Router, TypeScript)
* **Styling**: Vanilla CSS + CSS Modules with custom CSS variable design tokens
* **Database & Auth**: Supabase (PostgreSQL with `pgvector` extension + Supabase Auth)
* **Realtime Signaling**: Supabase Realtime Broadcast (`meet:${meetingId}`)
* **Meeting Architecture (Dual-Engine)**:
  - **In-App Studio**: Native WebRTC mesh (up to 5-6 participants) with zero lobby queues and zero bot blocking at `/meet/[id]`
  - **Bot Pipeline**: Recall.ai API for Google Meet automatic bot dispatch
* **Speech-to-Text**:
  - In-browser continuous `SpeechRecognition` (<200ms live typing with 1.2s auto-finalization)
  - Recall.ai built-in speaker diarization pipeline
* **AI Summarization & Embeddings**: Google Gemini 2.5 Flash (`@google/genai`) / Claude 3.5 Sonnet / OpenAI GPT-4o (`text-embedding-3-small`)
* **Integrations**: Google Calendar API v3, Slack Web API & Incoming Webhooks, Jira Cloud REST API v3 (with bi-directional status sync)
* **Hosting**: Vercel (Web App) + Supabase Cloud (Database & Auth)

---

## 4. Environment Variables Checklist (`.env.local`)

Before starting development or running the application, configure the following keys:

```bash
# ==========================================
# 1. Supabase (Database & Authentication)
# ==========================================
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ==========================================
# 2. Recall.ai (Meeting Bot Service - Optional for In-App Room)
# ==========================================
RECALL_AI_API_KEY="your-recall-ai-api-key"
RECALL_AI_REGION="us-east-1"

# ==========================================
# 3. LLM Provider (Primary: Gemini 2.5 Flash)
# ==========================================
GEMINI_API_KEY="AIzaSy..."
ANTHROPIC_API_KEY="sk-ant-api03-..."
OPENAI_API_KEY="sk-proj-..." # Used for text-embedding-3-small vector embeddings

# ==========================================
# 4. Google Calendar API (OAuth 2.0)
# ==========================================
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# ==========================================
# 5. Slack Integration
# ==========================================
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../..."
SLACK_BOT_TOKEN="xoxb-..." # Optional if using incoming webhooks

# ==========================================
# 6. Jira Cloud Integration
# ==========================================
JIRA_HOST_DOMAIN="yourorg.atlassian.net"
JIRA_USER_EMAIL="user@yourorg.com"
JIRA_API_TOKEN="ATATT3xFfGF0..."
JIRA_DEFAULT_PROJECT_KEY="ENG"

# ==========================================
# 7. Application URL
# ==========================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 5. College Demo Presentation Runbook (7-Minute Script)

1. **Step 1: Dashboard & Calendar Sync (Minute 0:00 - 1:00)**:
   - Presenter opens the `/dashboard`.
   - Clicks **"Sync Calendar"** to display scheduled Google Meet meetings for the current day.
2. **Step 2: Bot Dispatch (Minute 1:00 - 2:00)**:
   - Trigger the bot using the **"Dispatch Bot"** button or enter an active Google Meet room link.
   - The presenter opens Google Meet in a browser window to show the virtual bot requesting entry and joining the call.
3. **Step 3: In-Call Dialogue (Minute 2:00 - 4:00)**:
   - Presenters speak 3 clear points:
     1. *"Decision: We will adopt PostgreSQL for our transactional data store."*
     2. *"Action Item: Alex will finalize the database migration scripts by Friday at 5 PM."*
     3. *"Action Item: Jordan will draft the API security documentation by Thursday afternoon."*
   - Presenters hang up the call.
4. **Step 4: Real-Time Ingestion & AI Synthesis (Minute 4:00 - 5:00)**:
   - Recall.ai fires the `transcript.complete` webhook to the platform.
   - The UI automatically updates to display the full speaker-diarized transcript.
   - The LLM summarization pipeline extracts the exact decision and 2 action items with assignees and due dates.
5. **Step 5: Slack & Jira Verification (Minute 5:00 - 6:00)**:
   - Switch to the team Slack channel: show the formatted meeting summary posted automatically.
   - Switch to the Jira project board: show the 2 newly created tickets (`ENG-101`, `ENG-102`) with assigned users and due dates.
6. **Step 6: Semantic Q&A Demonstration (Minute 6:00 - 7:00)**:
   - On the web app, open the **"Ask Meeting"** drawer.
   - Query: *"What database did we decide to use, and when are the migration scripts due?"*
   - Display the instant AI answer citing the exact meeting timestamp.
