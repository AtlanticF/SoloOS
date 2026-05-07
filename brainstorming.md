## English (aligned with current code)

**SoloOS** (one-person company OS) — consolidated product and architecture notes, kept in sync with the repo: TypeScript/Node + SQLite, Vite + React web UI, and `solo capture` for entries.

### 1. Product & user stories

**Positioning**  
SoloOS is a data-driven system for **developers** who run a solo business. It uses five pillars — **Input, Output, Audience, Financial, Energy** — to turn ad-hoc work into a structured growth loop.

**ICP**  
* Indie developers with side projects, struggling with chaos, distribution, or mood.  
* Technical founders moving from “only coding” to running a business.

**Stories**  
* **A — frictionless capture:** log from the terminal in one line instead of a heavy Notion flow; the system should know which project a note belongs to when possible.  
* **B — business insight:** see whether effort on project A (e.g. commits) maps to money (ROI) before deciding to cut it.  
* **C — resilience:** the app can require a weekend review; a radar/balance view helps tell whether stress is from cash or from not resting.

### 2. System architecture

Headless design: the base owns data, the middleware shapes events, the UI surfaces intent.

* **A — Base (storage & CLI):** local Node/TS + SQLite (Drizzle), HTTP API, CLI entry: `solo capture` (alias `c`) in `apps/server/bin/solo.ts`, plus webhooks.  
* **B — Middleware (logic & skills):** project engine keyed by repo identity, attribution, async classification from `Entry` → `Event`.  
* **C — Presentation:** local **Vite + React** app (`apps/web`) — Cockpit, Explorer, Review **Review Gate**: Cockpit stays blocked until the current weekly review is completed.

### 3. Core data (conceptual)

| Object | Role |
| :----- | :--- |
| **Entry** | Raw, immutable input |
| **Event** | Structured mapping (pillar, project, impact, metadata) |
| **Project** | Container; repo as seed for identity |
| **Review** | Period + reflection + lock state for the gate |

Linkage: one project has many events; many events can trace to one entry; all records are time-ordered for trends and radar.

### 4. I/O

**In:** manual `solo capture "..."` (or `solo c "..."`); skills (e.g. GitHub push, billing); future clip/pipeline.  
**Out:** pillar balance (radar), per-project views, action items from review, and API access for custom skills.

### 5. MVP path (high level)

1. Schema in SQLite.  
2. `solo capture` writing `Entry` quickly.  
3. GitHub-related flow so projects appear from repo activity.  
4. Review UI implementing the **review gate** as the “ticket” into the Cockpit.
