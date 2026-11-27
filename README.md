# AutoSync Meet: AI Meeting Assistant Platform

An autonomous meeting intelligence platform built with **Next.js 14 App Router**, **TypeScript**, **PostgreSQL / Supabase**, **Native WebRTC Studio**, **Google Gemini 2.5 Flash**, **Recall.ai**, **Slack BlockKit**, and **Jira Cloud REST API v3**.

---

## 🌟 Key Features

1. **Dual-Engine Meeting Architecture**:
   - **In-App WebRTC Studio (`/meet/[id]`)**: Full-mesh video/audio conferencing for up to 5-6 participants with Supabase Realtime broadcast signaling. Zero lobby queues, zero Google anti-bot blocking (`You can't join this video call` bypassed), and 1-click room link sharing.
   - **Google Meet Bot Ingestion**: Automatic bot dispatch via Recall.ai for calendar-synced Google Meet calls with webhook transcription ingestion.

2. **Ultra-Fast Diarized Transcription**:
   - In-browser continuous `SpeechRecognition` delivering sub-second (<200ms) live typing feedback with glowing speaker badges and blinking cursor.
   - Fast 1.2-second silence auto-finalization eliminating browser 15-second latency.
   - Real-time subtitle overlays on video tiles and auto-scrolling live transcript sidebar.

3. **Google Calendar Integration & Meeting Discovery**:
   - Synchronizes upcoming calls via Google Calendar API v3.
   - Extracts Google Meet conference URLs and maps attendees.
   - Dedicated "In-App Room" launch buttons on Dashboard, Meetings Tab, and Meeting Detail views.

4. **AI Summarization & Action Item Extraction**:
   - High-speed structured JSON schema extraction using **Google Gemini 2.5 Flash (`@google/genai`)** with Claude 3.5 Sonnet / GPT-4o fallback and strict Zod validation.
   - Categorizes discussions into: Executive Overview, Key Decisions Made, Discussion Points, and Action Items.

5. **Slack Broadcast & Bi-Directional Jira Automation**:
   - Assembles rich Slack BlockKit notifications with deep links.
   - Automatically pushes action items to Jira Cloud REST API v3, creating tickets (`ENG-101`, `ENG-102`) with assignees, due dates, and auto-transition to "To Do".
   - Bi-directional status synchronization reflecting Jira column and resolution updates.

6. **Semantic Q&A Over Meeting Transcripts**:
   - Vector chunk retrieval (`pgvector`) answering natural language queries.
   - Cites exact dialogue excerpts with speaker names and timestamps (e.g. `[00:22] Jordan Rivera`).

7. **Automated Task Reminders**:
   - Cron engine evaluating action items with approaching deadlines (< 48 hours).

---

## 📖 Documentation Index

All architectural specifications, planning guides, and presentation runbooks are maintained in the [`Requirements/`](./Requirements/) directory:

- **[7-Minute Presentation Runbook](./Requirements/DEMO_RUNBOOK.md)**: Click-by-click walkthrough script and evaluator defense Q&A.
- **[Progress Memory Log](./Requirements/Memory.md)**: Sequential history of completed phases and architectural milestones.
- **[Project Requirements Document (PRD)](./Requirements/PRD.md)**: Problem statement, personas, and user stories.
- **[System Architecture & Tech Specs](./Requirements/Architecture.md)**: Sequence diagrams, In-App WebRTC Studio, tech stack, and database schema.
- **[Design System & UI Specs](./Requirements/Design.md)**: Design tokens, dark SaaS theme, and screen layouts.
- **[Implementation Phases & Roadmap](./Requirements/Phases.md)**: Milestone roadmap from Phase 0 to Phase 6.
- **[Engineering Rules & Conventions](./Requirements/Rules.md)**: Engineering standards, secrets isolation, and constraints.
- **[System Memory Specification](./Requirements/PROJECT_ARCHITECTURE_AND_SYSTEM_SUMMARY.md)**: Comprehensive deep-dive on system workflows and filters.
- **[Self-Hosted Bot Feasibility](./Requirements/OWN_BOT_WORKER_FEASIBILITY_AND_BLUEPRINT.md)**: Architecture analysis for standalone bot workers.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
*(Pre-configured with demo defaults for offline presentation mode)*

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.
