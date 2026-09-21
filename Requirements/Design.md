# Design System & UI Specification
## AI Meeting Assistant Platform — v2.2 (Final Unified Architecture)

> **Context & Evolution:**
> - **v1.0**: Ran an isolated indigo-glass SaaS palette, separate from the public marketing site.
> - **v2.0**: Unified the product with the marketing hero's near-black base (`#030303`), blue/cyan/gold energy palette, Space Grotesk display typography, and node/glow motifs.
> - **v2.1**: UI-only patch: base background lifted to `#08090B` for sustained reading, gold recency rule added, and node pulses synchronized to a shared 3.2s timer.
> - **v2.2 (This Final Specification)**: Closes critical operational gaps discovered during comprehensive system analysis:
>   1. **Diarization Semantic Protection (§5.2)**: Disallows coloring speaker dialogue bubbles with energy colors (blue/cyan/gold), preventing users from misinterpreting speakers as system states. Speakers receive neutral-tinted badges; energy colors remain strictly semantic.
>   2. **Brand Convergence (§1, §5.1)**: Unifies brand header across marketing and app shell using the shared glass listening mark.
>   3. **Modal & Floating Elevation Tokens (§2.4, §4)**: Explicitly standardizes dialog backdrops and popovers against the `#08090B` base.
>   4. **Definitive Button Class System (§4)**: Establishes clear separation between the marketing conversion gradient and in-product functional actions.

---

## 1. Overall Theme Direction & Aesthetic Principles

* **Aesthetic Identity**: Cinematic, high-trust, workstation-grade productivity platform. The atmosphere of the marketing site disciplined into a high-density, distraction-free tool for confidential workplace dialogue.
* **Core Semantic Metaphor**: The marketing hero's concept (*"many voices, converging into one clear structure"*) is the operational logic of the software:
  - **Blue (`--blue`)**: *In Motion / Live* — an active Google Meet call, a recording bot dispatched, an ongoing transcript ingestion.
  - **Cyan (`--cyan`)**: *In Transit / Informational* — citations linking Q&A back to exact transcript timestamps, real-time audio waveforms, search highlights.
  - **Gold (`--gold`)**: *Resolved / Arrived at Structure* — captured decisions, tasks synced to Jira, completed action items, time saved.
  - **Magenta (`--magenta`)**: *Marketing CTA Only* — strictly barred from in-app workstation actions.
* **Surface Styling**: Layered near-black base (`#08090B`) with subtle, localized radial glows (blue for active/live surfaces, gold for resolved items) replacing flat uniform glassmorphism.
* **Theme Mode**: Strict dark mode.

---

## 2. Design Tokens

### 2.1 Color Tokens

```css
:root {
  /* ================= Surface & Background Hierarchy ================= */
  --bg-base: #08090B;         /* Page canvas behind containers — optimized for long reading sessions */
  --bg-surface: #0B0C0E;      /* App sidebar, sticky topbars, table headers */
  --bg-card: #0E0F12;         /* Standard card, pane, and modal surface */
  --bg-card-hover: #141518;   /* Interactive hover state */
  --bg-elevated: #1C1D20;     /* Dropdowns, tooltips, popovers */
  --bg-glass: rgba(255, 255, 255, 0.035);

  /* ================= Text & Typography ================= */
  --text-primary: #FAFAFA;    /* 17.5:1 contrast against --bg-card (AAA) */
  --text-secondary: #C7C7CC;  /* 12.2:1 contrast against --bg-card (AAA) */
  --text-muted: #8D8D92;      /* 5.8:1 contrast against --bg-card (AA Body) */
  --text-faint: #56565B;      /* Disabled labels, inactive borders */
  --text-inverse: #1A1100;    /* High-contrast dark text on solid gold pills */

  /* ================= Borders & Dividers ================= */
  --border-subtle: #16171A;
  --border-default: #1F2024;
  --border-glass: rgba(255, 255, 255, 0.09);
  --border-focus: #3E8EF7;

  /* ================= Energy Palette ================= */
  --blue: #3E8EF7;            /* Dominant: Live, In Motion, Primary Actions */
  --cyan: #5FE7F2;            /* Secondary: Citations, Waveforms, Informational */
  --gold: #F2B94D;            /* Accent: Resolved Decisions, Synced Jira Tasks, Outcomes */
  --magenta: #F2609A;         /* Conversion CTA Gradient Only — never inside app workstation */

  --blue-bg: rgba(62, 142, 247, 0.12);
  --cyan-bg: rgba(95, 231, 242, 0.12);
  --gold-bg: rgba(242, 185, 77, 0.12);

  /* ================= Semantic Status ================= */
  --status-resolved: var(--gold);
  --status-resolved-bg: var(--gold-bg);
  --status-live: var(--blue);
  --status-live-bg: var(--blue-bg);
  --status-warning: #E8973C;   /* Amber-orange: Approaching deadline / Urgent (distinct from Gold) */
  --status-warning-bg: rgba(232, 151, 60, 0.12);
  --status-danger: #EF5A6F;    /* Crimson: Overdue task, API error, broken connection */
  --status-danger-bg: rgba(239, 90, 111, 0.12);

  /* ================= Third-Party Integration Brands ================= */
  --brand-slack: #ECB22E;
  --brand-jira: #0052CC;
  --brand-google: #4285F4;
}
```

### 2.2 Gold Recency & Hierarchy Rules

To prevent gold from becoming visual clutter when 80%+ of meetings and tasks are resolved:
1. **Atmospheric Glow (`--glow-gold`)**: Applied **only** to items resolved within the current browser session or the last 24 hours (e.g., a meeting that just summarized, or a task that just synced to Jira).
2. **Flat Badge (`--status-resolved-bg` + `--status-resolved`)**: Applied to all older resolved items. High-contrast, clean, and quiet, without radial glow wash.
3. **Semantic Distinction**: Warning states use `--status-warning` (#E8973C), which has a distinctly warmer, amber hue and an `AlertTriangle` or `Clock` icon, ensuring that pending urgency is never mistaken for resolved completion.

### 2.3 Spacing Scale (4px-based)

```css
:root {
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;  --space-12: 48px;
}
```

### 2.4 Radius Scale

```css
:root {
  --radius-sm: 6px;     /* Buttons, badges, input controls, icon boxes */
  --radius-md: 10px;    /* Internal cards, panels, dialog windows */
  --radius-lg: 14px;    /* Transcript pane, intelligence detail drawers */
  --radius-outer: 30px; /* Top-level workstation page shells (echoing hero outer shell) */
  --radius-full: 999px; /* Status pills, user avatars, node status indicators */
}
```

### 2.5 Elevation & Glow Tokens

```css
:root {
  --shadow-1: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-2: 0 6px 20px rgba(0, 0, 0, 0.55);
  --shadow-3: 0 16px 48px rgba(0, 0, 0, 0.75);
  --glass-blur: blur(12px);

  --glow-blue: 0 0 24px -6px rgba(62, 142, 247, 0.45);
  --glow-gold: 0 0 24px -6px rgba(242, 185, 77, 0.45);
  --glow-cyan: 0 0 24px -6px rgba(95, 231, 242, 0.40);
}
```

* **Depth vs. Meaning**: Shadows handle physical z-index (modals, dropdowns). Glows communicate live state.
* **Glow Discipline**: Cards do **not** glow at rest unless actively in a live state (`--glow-blue`) or recently resolved (`--glow-gold`).

### 2.6 Motion Scale & Synchronized Pulse

```css
:root {
  --hero-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 350ms;
}

@keyframes node-pulse {
  0%, 100% {
    opacity: 0.85;
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(62, 142, 247, 0.6);
  }
  50% {
    opacity: 1;
    transform: scale(1.28);
    box-shadow: 0 0 0 5px rgba(62, 142, 247, 0);
  }
}

@keyframes node-gold-settle {
  0%   { transform: scale(1.35); filter: drop-shadow(0 0 8px rgba(242, 185, 77, 0.9)); }
  100% { transform: scale(1);    filter: drop-shadow(0 0 2px rgba(242, 185, 77, 0.4)); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

* **Synchronized Timing**: All live `node-pulse` dots across any view share a uniform 3.2s duration, identical easing, and `animation-delay: 0s`. This eliminates visual flicker and presents a calm, cohesive system pulse.
* **Static Resolution**: A resolved item displays a static gold node dot without continuous animation.
* **Strict Particle Canvas Exemption**: The continuous drifting particle canvas is strictly restricted to the public marketing hero. It is explicitly prohibited from running behind transcript text, table rows, or workstation panes.

---

## 3. Typography Hierarchy

* **Display Type**: `Space Grotesk`, `Inter`, sans-serif (Display numbers, hero value metrics).
* **Workstation Type**: `Inter`, system-ui, sans-serif (H1 through Caption, body reading, tables).
* **Monospace Type**: `JetBrains Mono`, `Fira Code`, monospace (Timestamps `[12:34]`, Jira keys `ENG-402`, diarization markers).

| Level | Size | Line Height | Weight | Font | Application |
|---|---|---|---|---|---|
| **Display** | 2.25rem (36px) | 1.15 | 700 | Space Grotesk | Dashboard hero metric ("4.5h"), major statistics |
| **H1** | 1.75rem (28px) | 1.25 | 600 | Inter | Page titles ("Dashboard", "Task Tracker", "Meeting Detail") |
| **H2** | 1.25rem (20px) | 1.30 | 600 | Inter | Section headers, modal titles, panel headings |
| **H3** | 1.00rem (16px) | 1.40 | 600 | Inter | Card titles, decision item headers, table column headers |
| **Body Large** | 1.00rem (16px) | 1.55 | 400 | Inter | AI summaries, executive overview paragraphs |
| **Body Medium**| 0.875rem (14px)| 1.50 | 400 | Inter | Transcript dialogue text, table cell contents |
| **Caption** | 0.75rem (12px) | 1.40 | 500 | Inter / Mono | Timestamps, Jira status pills, speaker attribution tags |

---

## 4. Component Standards

### 4.1 Buttons

| State | Primary Blue Action | Resolved Action (Gold) | Secondary Card Button |
|---|---|---|---|
| **Default** | `var(--blue)` bg, `#FAFAFA` text | `var(--gold)` bg, `#1A1100` text | `var(--bg-card)` bg, 1px `var(--border-default)` |
| **Hover** | 1px lift, `var(--glow-blue)` | 1px lift, `var(--glow-gold)` | `var(--bg-card-hover)`, border `var(--border-focus)` |
| **Active** | `transform: scale(0.98)` | `transform: scale(0.98)` | `transform: scale(0.98)`, `var(--bg-elevated)` |
| **Focus** | 2px `var(--blue)` outline, 2px offset | 2px `var(--gold)` outline, 2px offset | 2px `var(--blue)` outline, 2px offset |
| **Disabled** | 40% opacity, cursor not-allowed | 40% opacity, cursor not-allowed | 40% opacity, cursor not-allowed |

* **Button Rule**: The marketing conversion gradient is never used inside the product. Primary functional actions use solid Blue (`--blue`).

### 4.2 Status Badges

* **Live Status**: `--status-live-bg` pill with `--blue` text and the active pulsing `node-pulse` dot.
* **Resolved Status**: `--status-resolved-bg` pill with `--gold` text and a static gold dot.
* **Warning Status**: `--status-warning-bg` pill with `--status-warning` text and a warning icon.
* **Danger Status**: `--status-danger-bg` pill with `--status-danger` text and a danger icon.

### 4.3 Modals & Floating Dialogs

* **Backdrop**: `rgba(8, 9, 11, 0.85)` with `backdrop-filter: blur(12px)`.
* **Surface**: `var(--bg-card)`, 1px `var(--border-default)`, radius `var(--radius-md)`, box-shadow `var(--shadow-3)`.

---

## 5. Screen Architectures

### 5.1 Global App Shell & Navigation (`layout.tsx`)

* **Sidebar**:
  - Background `--bg-surface`, border-right 1px `--border-subtle`.
  - Brand header: 34px rounded-square glass box with the 7px pulsing blue dot + "Converge AI" / "AutoSync Meet".
  - Nav items: Active tab highlighted with `--blue-bg` background and `--blue` icon/text.
* **Topbar**:
  - Background `--bg-surface` with backdrop blur, 1px bottom border.
  - "Standby Ready" engine status indicator with synchronized blue `node-pulse`.
  - "Dispatch Bot" button in primary blue; "Sync Calendar" in secondary card style.
* **Main Shell Container**:
  - Framed in `--radius-outer: 30px` on desktop with 1px `--border-subtle` and soft seated radial glow. On screens < 640px, flattens to edge-to-edge.

### 5.2 Dashboard (`/dashboard`)

* **Quick Stats Bar**:
  - **Hero Card (Time Saved)**: Space Grotesk Display number, subtle `--glow-gold` wash (resolved outcome).
  - **Upcoming Calls**: Blue pulsing "Bot Ready" indicator.
  - **Action Items / Tasks**: Small gold node dot indicating synced ratio.
* **Upcoming Meetings Grid**:
  - Cards on `--bg-card` with clean 1px border. "Dispatch Bot Now" triggers direct action in primary blue.
* **Recent Completed Meetings**:
  - 3-card responsive row. Fully summarized meetings display gold status pill. The single most recent meeting displays the subtle `--glow-gold` resting glow.

### 5.3 Meeting Detail View (`/meetings/[id]`)

* **Header Bar**: Displays meeting title, date/time, and gold "Resolved" badge with static node dot once processing completes.
* **Left Pane — Diarized Transcript**:
  - **Strict Diarization Protection Rule**: Speaker names and bubbles use neutral slate/zinc styling (`rgba(255, 255, 255, 0.05)`, text `#C7C7CC`). They are **never** colored with energy colors (blue/cyan/gold) to avoid false semantic state readings.
  - Timestamps in `[HH:MM]` monospace.
  - Active search highlights in soft cyan tint.
  - **Strictly NO particle canvas background** — high-contrast dark slate readability.
* **Right Pane — AI Intelligence Panel**:
  - **Decisions**: Each decision item preceded by a gold node icon.
  - **Action Items & Jira**: Synced tasks display a gold node dot beside the Jira badge; pending items show a neutral outline node.
  - **Ask Meeting (Q&A)**: Citation pills rendered in `--cyan-bg` with `--cyan` text. Clicking a citation jumps directly to that transcript timestamp.

### 5.4 Task Tracker & Jira Sync (`/tasks`)

* **Filter Bar**: Status, assignee, and priority filters in `--bg-card`.
* **Data Table**:
  - Rows on `--bg-card`, hover `--bg-card-hover`, no resting row glow.
  - **Jira Status Column**:
    - Synced: Static gold node dot + monospace `ENG-xxx` link in gold.
    - Not Synced: Neutral outline circle with secondary "Push to Jira" action.
    - Syncing: Blue pulsing node dot.
  - **Due Dates**: Approaching deadlines use amber-orange `--status-warning`, never gold.

### 5.5 Settings & Integrations (`/settings`)

* Integration cards (Google Calendar, Jira, Slack, Recall.ai):
  - Connected: Synchronized blue `node-pulse` dot.
  - Disconnected: Neutral gray static dot.
  - Expired/Error: Red `--status-danger` static dot.

---

## 6. Accessibility & Contrast Verification

All text and interactive tokens satisfy WCAG 2.1 AA and AAA standards on `--bg-card` (`#0E0F12`):
- `--text-primary` (`#FAFAFA`): 17.5:1 (AAA)
- `--text-secondary` (`#C7C7CC`): 12.2:1 (AAA)
- `--text-muted` (`#8D8D92`): 5.8:1 (AA Body)
- `--gold` (`#F2B94D`): 10.4:1 (AAA)
- `--blue` (`#3E8EF7`): 6.1:1 (AA)
- `--status-warning` (`#E8973C`): 7.2:1 (AAA)
- `--status-danger` (`#EF5A6F`): 5.2:1 (AA)

Reduced motion settings disable all continuous animations and substitute clean static states.
