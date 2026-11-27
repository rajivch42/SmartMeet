# Self-Hosted Playwright Bot Worker — Feasibility & Architectural Blueprint

> **Target:** AutoSync Meet Platform (`c:\EDAI7`)  
> **Status:** Architecture & Design Phase (No code built yet)  
> **Scope:** Google Meet, Live Captions Scraping, Standalone Worker Service

---

## 1. Frank Feasibility Assessment

### Is it possible?
👉 **YES, 100% FEASIBLE.**

Building a custom Google Meet bot using **Playwright + Chromium** that reads Google Meet's built-in live captions is entirely achievable and was the foundational architecture used by early-stage meeting intelligence platforms before Recall.ai existed.

### How It Works Under the Hood
1. A Node.js worker spawns a headless Chromium instance with microphone/camera permissions stubbed out.
2. The browser navigates to `meet.google.com/xxx-xxxx-xxx`, enters as a guest (`AutoSync AI Assistant`), and clicks **"Ask to join"**.
3. Once the host admits the bot, Playwright triggers Google Meet's native live closed captions (shortcut key `c` or caption button).
4. Google Meet's internal speech-to-text engine transcribes the audio in real-time, displaying each speaker's name and words in DOM elements.
5. A JavaScript `MutationObserver` captures these DOM mutations, debounces them into coherent speaker turns (`Rajiv: "Let's review the API by Friday"`), and compiles the final transcript.
6. When the meeting ends, the worker sends an HTTP POST with the transcript to AutoSync Meet's new `/api/webhooks/own-bot`, which hands it off to your existing **Gemini ➔ Jira ➔ Slack** pipeline.

---

### Trade-Off Comparison: Recall.ai vs. Own Bot Worker

| Factor | Recall.ai (Current) | Own Bot Worker (Proposed) |
| :--- | :--- | :--- |
| **External API Cost** | Paid per recorded minute | **\$0 API fees** (Only your own VPS/server cost) |
| **Audio Quality** | Native raw audio stream | Reads Google Meet's live text captions |
| **Transcription Engine** | Recall's Whisper / AssemblyAI | Google Meet's built-in caption STT engine |
| **Speaker Separation** | Acoustic audio diarization | **Built-in DOM speaker labels** (Google Meet tags each line with the participant's name) |
| **Maintenance** | Zero maintenance (Recall manages bots) | Moderate (Must update CSS selectors if Google tweaks Meet UI) |
| **Server Requirements** | Pure serverless (Runs on Vercel) | Requires a VPS / Docker container (Chromium needs ~400MB RAM per bot) |

---

## 2. Redesigned 8-Step Implementation Blueprint

```mermaid
flowchart TD
    subgraph AutoSyncNextApp["AutoSync Meet (Next.js - Port 3000)"]
        Cron[Auto-Join Cron]
        Manual[Send Bot Now Button]
        Provider[Capture Provider Interface]
        WebhookOwn[/api/webhooks/own-bot]
        Gemini[Google Gemini Pipeline]
        Jira[Jira & Slack Sync]
    end

    subgraph BotWorkerService["Bot Worker Service (Express + Playwright - Port 3001)"]
        API[Express POST /jobs]
        PW[Playwright Chromium Instance]
        Lobby[Lobby & Admission Handler]
        Captions[Caption DOM Observer]
        Merge[Sliding Window Text Merger]
        Lifecycle[Meeting End & Exit Watcher]
    end

    Cron --> Provider
    Manual --> Provider
    Provider -->|HTTP POST /jobs| API

    API --> PW
    PW --> Lobby
    Lobby -->|Host Admits Bot| Captions
    Captions --> Merge
    Merge --> Lifecycle
    Lifecycle -->|HTTP POST signed transcript| WebhookOwn

    WebhookOwn --> Gemini
    Gemini --> Jira
```

---

### Step 1 — Worker Architecture & Environment Setup
Create a standalone Node.js + TypeScript service directory at `c:\EDAI7\bot-worker`.  
It must run as an independent background service on its own port (`3001`), because long-running browser processes cannot run inside Vercel serverless functions.

**Project Tree:**
```
c:\EDAI7\bot-worker\
├── src/
│   ├── index.ts          # Express server: POST /jobs, DELETE /jobs/:id, GET /health
│   ├── runBot.ts         # Orchestrator managing a meeting from spawn to teardown
│   ├── join.ts           # Handles URL navigation, guest input, and admission polling
│   ├── captions.ts       # Enables captions and injects MutationObserver into the page
│   ├── merge.ts          # Aggregates real-time word fragments into clean speaker turns
│   ├── selectors.ts      # Centralized, resilient CSS and ARIA selectors
│   └── post.ts           # Signs and dispatches the final transcript to AutoSync Meet
├── Dockerfile            # Headless Linux container with Chromium dependencies
├── package.json
└── .env
```

**Key Dependencies:**
- `playwright`: Headless browser control.
- `express`: Lightweight HTTP control server.
- `zod`: Request payload validation.
- `dotenv`: Configuration.

---

### Step 2 — Pluggable Provider Interface in AutoSync Meet
Before touching bot code, create a polymorphic interface in AutoSync Meet. This guarantees that **Recall.ai and your custom bot can run side-by-side**, switchable by an environment variable (`CAPTURE_PROVIDER=own` or `CAPTURE_PROVIDER=recall`).

**Files in `src/lib/services/capture/`:**
1. `types.ts`:
   ```ts
   export interface CaptureRequest {
     meetingId: string;
     meetingUrl: string;
     botName: string;
   }
   export interface MeetingCaptureProvider {
     name: 'recall' | 'own';
     dispatch(req: CaptureRequest): Promise<{ botId: string }>;
     stop(botId: string): Promise<void>;
   }
   ```
2. `recall.provider.ts`: Wraps your existing Recall.ai dispatch logic.
3. `own.provider.ts`: Calls your local worker (`POST http://localhost:3001/jobs`).
4. `index.ts`: Factory returning the selected provider based on `process.env.CAPTURE_PROVIDER`.

---

### Step 3 — Meet Navigation, Permissions & Waiting Room Handler
Google Meet blocks bots that do not properly handle audio/video device queries or stay stuck in lobbies.

**Essential Chromium Launch Flags (`src/join.ts`):**
```ts
const browser = await chromium.launch({
  headless: process.env.HEADLESS !== 'false',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--disable-blink-features=AutomationControlled', // Evades naive bot detection
    '--no-sandbox',
  ],
});
```

**State Machine for Admission:**
1. **Lobby Input:** Type the bot name (default: `"AutoSync AI Assistant"`).
2. **Device Muting:** Explicitly mute camera and microphone before knocking.
3. **Knock:** Click `"Ask to join"`.
4. **Waiting Room States:**
   - **Admitted:** Main video grid detected ➔ proceed to Step 4.
   - **Denied:** Host clicked "Deny" ➔ immediately close browser, update status to `failed` (`"Host denied entry"`).
   - **Timeout:** If not admitted within 10 minutes ➔ close browser, update status to `failed` (`"Admission timed out"`).

---

### Step 4 — Enabling Captions & Real-Time DOM Observation
Once inside the call, the bot activates Google Meet's closed captions:

1. **Activate Captions:** Press keyboard shortcut `c` or click the button matching `button[aria-label*="captions" i]`.
2. **DOM Injection via `page.exposeFunction`:**
   Inject a lightweight `MutationObserver` onto the captions container.
3. **Caption Stream Structure:**
   Google Meet updates captions as people speak. Each caption block contains:
   - Speaker name (e.g., `Rajiv R. Chaurasiya`)
   - Speaker avatar/profile link
   - Text spans that update live as words are spoken.

---

### Step 5 — Real-Time Text Merge Algorithm (`src/merge.ts`)
Google Meet's caption elements mutate rapidly (e.g., `"Let's"`, `"Let's review"`, `"Let's review the API"`).  
If you capture every mutation directly, the transcript would contain 20 duplicates of the same sentence.

**The Solution — Sliding Window Debouncer:**
- Keep an in-memory buffer of active speaker lines.
- When speaker A is speaking, keep overwriting their active buffer with the latest incoming phrase.
- When the speaker stops speaking for $> 2.5$ seconds or speaker B starts talking:
  - Commit the final sentence of speaker A to the immutable transcript array:
    $$\text{[10:14] Rajiv R. Chaurasiya: "Let's review the API documentation before Friday."}$$
  - Clear speaker A's active buffer.

---

### Step 6 — Exit Detection & Secure Webhook Delivery
The bot must know when to gracefully hang up and upload the transcript:

1. **Exit Triggers:**
   - **Alone in Call:** When participant count drops to 1 (only the bot remains) for $> 30$ seconds.
   - **Meeting Ended by Host:** Detected via the `"You've been removed from the meeting"` or `"The meeting has ended"` modal.
   - **Manual Stop:** AutoSync Meet calls `DELETE /jobs/:id` (triggered by the user clicking "Stop bot").
   - **Max Safety Limit:** Hard cutoff at 120 minutes.
2. **Webhook Callback (`src/post.ts`):**
   - The worker sends a cryptographically signed HMAC payload to AutoSync Meet:
     `POST /api/webhooks/own-bot`
   - Payload:
     ```json
     {
       "meeting_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
       "raw_text": "[00:15] Rajiv: Let's finalize the Jira integration...\n[00:30] Yogesh: I will verify it.",
       "speakers": ["Rajiv", "Yogesh"],
       "duration_seconds": 1420
     }
     ```
3. **AutoSync Meet Ingestion (`src/app/api/webhooks/own-bot/route.ts`):**
   - Saves the transcript to Supabase.
   - Sets meeting status to `transcribed`.
   - Triggers Google Gemini to extract decisions and action items, then updates Jira and Slack.

---

### Step 7 — Containerization & Deployment
Because Chromium requires Linux shared libraries and shared memory:

* **Docker Image:** Standard `mcr.microsoft.com/playwright:v1.48.0-focal`.
* **RAM Allocation:** Allocate at least 1 GB of RAM for the container (sufficient for 2–3 concurrent bots).
* **Launch Flag:** `--disable-dev-shm-usage` (prevents browser crashes in Docker).
* **Hosting Options:**
  - **Local Development:** Run directly on your machine (`npm run dev` inside `bot-worker`).
  - **Production:** A \$5–\$10/month VPS (DigitalOcean, Railway, Render, or AWS EC2).

---

### Step 8 — Defensive Engineering (Resilience Against Google UI Updates)
Google Meet periodically updates its internal class names (e.g. `div.zs7LEd`). To make the bot resilient:

1. **Prioritize Semantic Selectors:**
   - Instead of targeting `.zs7LEd`, target `button[aria-label*="captions" i]`, `button[data-tooltip*="caption" i]`, or keyboard shortcut `'c'`.
2. **Multi-Selector Fallback Array:**
   In `src/selectors.ts`, define fallback arrays:
   ```ts
   export const CAPTION_SELECTORS = [
     'div[aria-live="polite"]',
     'div[jsname="YSvy7"]',
     'div.nMxBNf',
   ];
   ```
3. **Visual Headed Mode for Debugging:**
   In local development, set `HEADLESS=false` in `bot-worker/.env` so you can watch the browser window live, inspect elements, and debug interactions.

---

## 3. Recommended Phased Roadmap

| Phase | Milestone | Deliverable |
| :--- | :--- | :--- |
| **Phase 1** | **Capture Provider Abstraction** | Build `src/lib/services/capture/` in AutoSync Meet so Recall.ai remains fully functional while the worker is being developed. |
| **Phase 2** | **Worker Prototype** | Create `bot-worker/`, launch Playwright, and test joining a real Google Meet room as a guest. |
| **Phase 3** | **Caption Extraction & Merge** | Enable captions, verify `MutationObserver` captures text, and test the sentence merging debouncer. |
| **Phase 4** | **Webhook Connection** | Create `/api/webhooks/own-bot` in AutoSync Meet and connect it to the Gemini + Jira + Slack pipeline. |
| **Phase 5** | **Testing & Dockerization** | Test with real multi-person Google Meet calls, edge cases (denial, disconnect), and package in Docker. |

---

> [!NOTE]
> This blueprint gives you complete independence from third-party bot fees while keeping your existing Gemini, Jira, and Slack integrations untouched. Whenever you are ready to begin, we will start with **Phase 1 (the Provider Interface)**.
