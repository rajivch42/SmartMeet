# AutoSync Meet: 7-Minute College Demo Runbook

This runbook provides the exact click-by-click presentation script, speaker talking points, and technical defense guide for presenting the **AI Meeting Assistant Platform** to faculty evaluators.

---

## 🚀 Pre-Demo Checklist (60 Seconds Before Demo)
1. Ensure the development server is running in terminal:
   ```bash
   npm run dev
   ```
2. Open your browser to:
   **[http://localhost:3000](http://localhost:3000)**
3. If you ever need to reset the data during rehearsal or after a demo run, click **"Reset Demo State"** on the Dashboard or send:
   ```bash
   curl -X POST http://localhost:3000/api/demo/reset
   ```

---

## ⏱️ 7-Minute Presentation Timeline

### Minute 0:00 – 1:00 | The Problem & Architecture Overview
* **Screen**: Dashboard (`/dashboard`)
* **What to Say**:
  > *"Good morning professors. In engineering and corporate organizations, valuable decisions and task assignments made during meetings are frequently lost. Engineers spend hours in status meetings, manually copying action items into Jira, while critical deadlines slip through the cracks.*
  >
  > *Today, I'm presenting **AutoSync Meet** — an autonomous AI Meeting Assistant that hooks into Google Calendar, dispatches a virtual bot to record and diarize speech, synthesizes structured decisions using LLMs, and automatically pushes tickets into Jira while broadcasting executive recaps to Slack.*
  >
  > *Notice our live Command Center: it monitors calendar events, tracks extracted commitments, and calculates engineering time saved."*

---

### Minute 1:00 – 2:15 | Google Calendar Discovery & Autonomous Bot Dispatch
* **Screen**: Navigate to **Meetings** (`/meetings`) or click on **"Sprint 24 Architecture & Schema Sync"** (`/meetings/demo-meet-001`).
* **What to Do**:
  1. Show the meeting details: Date, 3 attendees (Alex Morgan, Jordan Rivera, Sarah Chen), and Google Meet URL.
  2. Click the primary button: **"Dispatch Bot & Capture Audio"**.
  3. Watch the status transition to `transcribed` and see the **Diarized Transcript** stream populate on the left pane with speaker tags and precise timestamps:
     - `[00:05] Alex Morgan`
     - `[00:22] Jordan Rivera`
     - `[00:48] Sarah Chen`
* **What to Say**:
  > *"Under the hood, our platform communicates with the Recall.ai API. When a meeting begins, a headless bot enters the call, records audio, and streams back diarized utterances with milliseconds precision. Notice every single speaker is uniquely tagged and timestamped."*

---

### Minute 2:15 – 3:45 | AI Summarization & Structured Extraction
* **Screen**: Meeting Detail (`/meetings/demo-meet-001`), Right Pane.
* **What to Do**:
  1. Click the button: **"Generate AI Summary"**.
  2. The LLM pipeline executes (Claude 3.5 Sonnet / GPT-4o).
  3. Showcase the 3 tabs:
     - **Tab 1: AI Summary**:
       - *Executive Overview*: High-level technical summary.
       - *Decisions Made (with green checkmarks)*:
         1. Adopt PostgreSQL 16 over MongoDB.
         2. Establish strict relational schemas.
       - *Discussion Points*: Breakdown of topics discussed.
     - **Tab 2: Action Items & Jira**:
       - Highlight the 2 auto-extracted tasks with explicit owners, priorities, and deadlines:
         - **Alex Morgan**: Schema migration (High Priority, Friday 5 PM).
         - **Sarah Chen**: OAuth & security review (Medium Priority, Thursday 12 PM).
* **What to Say**:
  > *"Unlike naive ChatGPT prompts that return unformatted paragraphs, our engine uses strict JSON schemas and Zod validation. It separates general discussion from binding decisions, and extracts structured action items with assignees, priorities, and deadline timestamps."*

---

### Minute 3:45 – 4:45 | Slack Channel Broadcast & Jira Cloud Synchronization
* **Screen**: Meeting Detail (`/meetings/demo-meet-001`) & Task Tracker (`/tasks`).
* **What to Do**:
  1. Click **"Post to Slack"** in the top action header. Point out the success badge: *"Broadcasted to #meeting-summaries"*.
  2. Switch to **Tab 2 (Action Items)** and click **"Push All to Jira"**.
  3. Notice the buttons instantly transform into green Jira ticket badges:
     - `ENG-101` (Alex Morgan's task)
     - `ENG-102` (Sarah Chen's task)
  4. Click on **Task Tracker** in the left sidebar (`/tasks`).
  5. Show the unified engineering backlog table with status pills, priority tags, and direct links to Jira Cloud.
* **What to Say**:
  > *"With two clicks, the team lead didn't have to write a single email or Jira ticket. Slack received an Atlassian BlockKit payload for team visibility, and the Jira Cloud REST API v3 created verified sprint tickets mapped directly to assignees."*

---

### Minute 4:45 – 6:00 | Semantic Q&A Over Diarized Transcripts
* **Screen**: Return to Meeting Detail (`/meetings/demo-meet-001`) and click **Tab 3: Ask AI (Q&A)**.
* **What to Do**:
  1. Click the preset pill: *"What database did we decide to use?"*
  2. Point out the grounded answer:
     > *"The team decided to adopt PostgreSQL 16 rather than MongoDB to enforce strict ACID compliance and relational consistency."*
  3. **Point to the Source Citations box**:
     - `[00:22] Jordan Rivera: "We decided to adopt PostgreSQL 16..."`
  4. Click the second preset pill: *"Who is handling migration?"*
  5. Show the direct owner answer citing Alex Morgan and the Friday 5:00 PM deadline.
* **What to Say**:
  > *"For large engineering teams, searching hours of video recordings is impossible. We vectorized the dialogue chunks. When a user asks a question, our cosine search locates the exact turn in the conversation and cites the speaker and timestamp as proof, eliminating hallucinations."*

---

### Minute 6:00 – 7:00 | Automated Reminders, Architecture Defense & Conclusion
* **Screen**: Task Tracker (`/tasks`) & Settings (`/settings`).
* **What to Do**:
  1. On `/tasks`, click **"Trigger Reminders"**.
  2. Highlight the notification: *"Evaluated tasks: sent deadline reminder alerts to assignees."*
  3. Navigate to **Settings** (`/settings`):
     - Show configured integration endpoints (Google Calendar, Recall.ai, Slack Webhook, Jira Cloud).
     - Point out the disabled **"Anonymous Peer-Help Network"** badge marked *Coming in Phase 2*, demonstrating modular architectural planning.
* **What to Say**:
  > *"Our cron reminder engine automatically monitors approaching task deadlines and sends automated alerts before work is overdue.*
  >
  > *In summary, AutoSync Meet takes an engineering team from an unscheduled conversation to a fully documented sprint backlog in minutes. All 6 planned phases are operational, production-typed, and resilient. Thank you, and I welcome your questions."*

---

## 🛡️ Evaluator Defense & Technical Q&A Cheatsheet

### Q1: "How do you handle API downtime or external network failures during a live call?"
* **Answer**:
  > *"We implemented a hybrid architecture. The platform attempts live communication with Supabase, Recall.ai, and Jira with strict 10-12 second timeouts. If an external third-party API fails or lacks internet access, the service layer transparently falls back to an in-memory deterministic state engine without throwing uncaught runtime exceptions."*

### Q2: "Why did you build this in Next.js 14 App Router instead of a separate Express backend?"
* **Answer**:
  > *"Next.js 14 App Router allows unified full-stack TypeScript. The frontend components and backend API route handlers share common Zod validation schemas and database types, ensuring zero type drift between server and client without requiring a separate microservice build step."*

### Q3: "How do you prevent LLM hallucinations in the Q&A retrieval?"
* **Answer**:
  > *"We enforce grounded retrieval-augmented generation (RAG). The user query is matched against timestamped transcript dialogue chunks using similarity scoring. The LLM is strictly prompted to answer based only on the retrieved excerpts and is required to cite the speaker name and timestamp offset."*

### Q4: "Why is the Anonymous Peer-Help module disabled?"
* **Answer**:
  > *"Per our project requirements and sprint roadmap, Phase 1 was strictly scoped to meeting intelligence and workflow automation. We designed the data models and settings schema to leave architectural room for Peer-Help in Phase 2 without incurring technical debt or scope creep."*
