# AutoSync Meet: AI Meeting Assistant Platform

An autonomous meeting intelligence platform built with **Next.js 14 App Router**, **TypeScript**, **PostgreSQL / Supabase**, **Recall.ai**, **Claude 3.5 Sonnet / OpenAI**, **Slack BlockKit**, and **Jira Cloud REST API v3**.

---

## 🌟 Key Features

1. **Google Calendar Integration & Meeting Discovery**:
   - Synchronizes upcoming calls via Google Calendar API v3.
   - Extracts Google Meet conference URLs and maps attendees.
   - Fallback offline calendar schedule ensures presentation reliability.

2. **Recall.ai Virtual Bot Dispatch & Diarization**:
   - Headless bot joins Google Meet calls and captures raw multi-track audio.
   - Generates millisecond-accurate diarized transcripts attributing dialogue to speakers.

3. **AI Summarization & Action Item Extraction**:
   - Structured JSON schema parsing via Claude 3.5 Sonnet / GPT-4o with Zod validation.
   - Categorizes discussions into: Executive Overview, Key Decisions Made, Discussion Points, and Action Items.

4. **Slack Broadcast & Jira Task Automation**:
   - Assembles rich Slack BlockKit notifications with deep links.
   - Automatically pushes action items to Jira Cloud REST API v3, creating tickets (`ENG-101`, `ENG-102`) with assignees and due dates.

5. **Semantic Q&A Over Meeting Transcripts**:
   - Vector chunk retrieval answering natural language queries.
   - Cites exact dialogue excerpts with speaker names and timestamps (e.g. `[00:22] Jordan Rivera`).

6. **Automated Task Reminders**:
   - Cron engine evaluating action items with approaching deadlines (< 48 hours).

---

## 📖 Documentation Index

- **[7-Minute Presentation Runbook](./DEMO_RUNBOOK.md)**: Click-by-click walkthrough script and evaluator defense Q&A.
- **[Requirements & Planning](./Requirements/)**:
  - `PRD.md`: Problem statement, personas, and user stories.
  - `Architecture.md`: Sequence diagrams, tech stack, and database schema.
  - `Design.md`: Design tokens, dark SaaS theme, and screen layouts.
  - `Phases.md`: Development roadmap from Phase 0 to Phase 6.
  - `Rules.md`: Engineering conventions and anti-patterns.
- **[Progress Memory Log](./Memory.md)**: Sequential history of completed phases.

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
