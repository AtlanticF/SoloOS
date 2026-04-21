# SoloOS — Design Specification

**Date:** 2026-04-21
**Status:** Approved, pending implementation

---

## 1. Product Positioning

SoloOS is a locally-run **Business Loop OS** for developer-founders — a system that compiles raw activity data into business decisions. It is not a note-taking app.

Core value: connect signals scattered across code, revenue, content, and energy through five pillars, automatically surface correlations, and generate actionable insights.

### Target User

Developer-capable solopreneurs who believe in "code as systems," value data sovereignty, and are frustrated by fragmented SaaS tooling.

### Key Differentiators

- **Correlation-first**: The soul of the product is cross-domain linking (Input → Output → Financial), not logging
- **System-driven**: Projects emerge from data automatically — no manual maintenance required
- **Data sovereignty**: Fully local, no cloud dependency, data stored at `~/.soloos/soloos.db`

---

## 2. The Five Pillars

| Pillar | Domain | Meaning | Typical Events |
|--------|--------|---------|----------------|
| Input | Knowledge | Information intake, learning, research | Reading a competitor analysis |
| Output | Productivity | Code commits, content published, deliverables | GitHub commit, publishing an article |
| Audience | Growth | User acquisition, deep interactions | New paying user, high-value business meeting |
| Financial | Cash flow | Revenue events, fixed costs | Stripe payment received, SaaS subscription charged |
| Energy | State | Anomalous personal signals | 12-hour crunch session, insomnia, post-milestone high |

---

## 3. Tech Stack

### Project Structure

pnpm workspace monorepo with three packages:

```
SoloOS/
├── apps/
│   ├── server/        # Hono + TypeScript + SQLite
│   └── web/           # Vite + React
├── packages/
│   └── shared/        # Shared TypeScript type definitions
└── package.json
```

### Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Server | Hono + TypeScript | Lightweight, TS-first, 3× faster than Express |
| ORM | Drizzle ORM | Native SQLite support, fully type-safe |
| Web | Vite + React | Best-in-class DX |
| UI | shadcn/ui + Recharts | Complete component set, Radar/Sparkline support |
| Data fetching | TanStack Query | Cache + async state management |

### Dev Start

```bash
pnpm dev   # Starts server :3000 + web :5173 concurrently
```

---

## 4. Data Model

### 4.1 Core Tables

#### `entries` — Raw input (immutable)

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | UUID |
| content | TEXT | Raw content: text, URL, or JSON |
| source | TEXT | cli / github / stripe / browser-ext |
| status | TEXT | pending / processed |
| quick_tags | TEXT | JSON array — user-provided quick labels |
| created_at | INTEGER | Unix timestamp |

#### `events` — Core atom (structured)

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | UUID |
| entry_id | TEXT FK | → entries |
| pillar | TEXT | INPUT / OUTPUT / AUDIENCE / FINANCIAL / ENERGY |
| project_id | TEXT FK? | → projects, nullable |
| impact_score | INTEGER | -10 to 10, effect on the pillar |
| classifier | TEXT | rule / api-key / skill — who classified this |
| metadata | TEXT | JSON, extensible fields |
| occurred_at | INTEGER | When the event happened |
| created_at | INTEGER | When the record was written |

#### `projects` — Logical aggregator

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT | Project name, can be auto-generated |
| status | TEXT | active / dormant / completed |
| match_rules | TEXT | JSON — repo names / tag patterns |
| is_auto | INTEGER | 0 = manually created, 1 = system-discovered |
| first_event_at | INTEGER | Defines project start |
| last_event_at | INTEGER | No events for 14 days → auto dormant |
| created_at | INTEGER | |

> ROI = SUM(Financial event impact scores), computed live from events — no cached field.

#### `reviews` — Periodic review (Review Gate state machine)

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | UUID |
| period | TEXT | weekly / monthly |
| period_start | INTEGER | |
| period_end | INTEGER | |
| snapshot | TEXT | JSON — per-pillar stats for the period |
| reflection | TEXT | User's written retrospective |
| ai_insight | TEXT | AI-generated trend analysis |
| completed_at | INTEGER | **NULL = incomplete → triggers Review Gate lock** |

### 4.2 Relation Table

#### `event_links` — Cross-domain correlation (the soul of the product)

| Field | Type | Description |
|-------|------|-------------|
| source_event_id | TEXT FK | → events |
| target_event_id | TEXT FK | → events |
| link_type | TEXT | caused / related / derived |
| confidence | REAL | 0–1, AI confidence score; 1.0 = human-confirmed |
| created_by | TEXT | rule / ai / human |

Example chain: `Input (competitor analysis) → caused → Output (dynamic pricing feature) → derived → Financial ($99 revenue)`

---

## 5. AI Classification Layer

### Classification Strategy: Rules-first + AI Fallback (Hybrid)

**Rule layer** (no AI required, covers ~80% of events):
- GitHub webhook → pillar: OUTPUT, auto-assigned to project by repo name
- Stripe webhook → pillar: FINANCIAL
- CLI with `-p` flag → user-specified pillar

**AI layer** (fallback for unstructured CLI free-text input):

The server exposes two unified endpoints. The classifier is external and pluggable:

```
GET  /api/entries?status=pending   # Fetch unclassified entries
POST /api/events/batch             # Write back classification results
```

### Two AI Classification Modes

**Mode 1: API Key**
- User configures any OpenAI-compatible API key in `~/.soloos/config.json`
- Server calls the API asynchronously — no manual trigger needed
- Supports OpenAI, Anthropic, local models, any compatible provider

**Mode 2: Agent Skill**
- SoloOS ships a Claude Code skill (`soloos-classifier`)
- User installs it into their Claude Code agent; runs on a schedule or manually
- Skill pulls pending entries → classifies via Claude → batch writes back events
- Ideal for users already running Claude Code — reuses their existing session

---

## 6. UI Design

### Navigation Model

Three layers, progressive depth — page routing + slide-over panel:

```
Cockpit (/)  →[click pillar/project]→  Explorer (/explorer)  →[click event]→  Sheet slide-over (Node)
```

The Node layer uses shadcn `<Sheet side="right">` — overlays Explorer without losing context.

### Layer 1: Cockpit (Macro overview)

Route: `/`

- **Pentagon Radar Chart** (Recharts RadarChart): live five-pillar balance
- **Pulse metric cards** (shadcn Card): cash flow slope, commit velocity, audience growth rate
- **30-day Sparklines**: per-pillar trend over the past month
- **Review Gate**: when `completed_at = NULL`, entire Cockpit is replaced by `<ReviewGate />` — forces retrospective before unlocking

### Layer 2: Explorer (Entity management)

Route: `/explorer`

- **Tabs** (shadcn Tabs): Projects | Pillars
- **Projects view**: Bento Grid project cards showing ROI, event count, per-pillar distribution
  - Click card → project-scoped event timeline
  - AI-discovered potential projects appear as dashed "pending confirmation" cards
- **Pillars view**: Events timeline grouped by pillar (ScrollArea)
- **Manual link**: top-bar button opens Dialog for `solo p link <event_id> <project_id>`

### Layer 3: Node (Atomic detail)

Trigger: click any Event → `<Sheet side="right">` slides in

- **Event content**: raw content + source + timestamp
- **Relation chain**: visualizes `event_links` (Input → Output → Financial causal path)
- **Calibration panel**:
  - AI confidence score displayed
  - Confirm link / Disconnect / Adjust manually
  - `confidence = 1.0` marks human-confirmed — becomes fine-tuning signal

### Global Layout Shell

- Fixed icon sidebar (52px): Cockpit / Explorer / Review / Settings
- Top status bar: system health summary + current week Review status

### shadcn Component Mapping

| Feature | Component |
|---------|-----------|
| Project cards / metric cards | `Card` |
| Explorer view switch | `Tabs` |
| Node detail panel | `Sheet side="right"` |
| Pillar labels | `Badge` variant |
| Manual link dialog | `Dialog` |
| Event list | `ScrollArea` |
| Link confirmation buttons | `Button` variant |
| Review Gate | Full-screen replacement component |

---

## 7. MVP Scope (V1)

**V1 goal**: write one Entry via CLI, see productivity and revenue curves move together on the Dashboard.

### V1 Includes

1. **Data layer**: Complete SQLite schema (5 tables) + Drizzle ORM migrations
2. **Server**: `POST /api/entries`, `GET /api/events`, `GET /api/projects`, webhook ingestion (GitHub / Stripe)
3. **Rule classifier**: GitHub → OUTPUT, Stripe → FINANCIAL, auto project attribution by repo name
4. **CLI**: `solo capture "content"` writes Entry; `solo capture -p input "content"` specifies pillar
5. **Cockpit**: Radar Chart + 3 Pulse metric cards + Review Gate logic
6. **Explorer**: Projects Bento Grid + event timeline
7. **Node**: Sheet slide-over with event detail + basic relation chain

### V2 (Later iterations)

- AI classification — Mode 1 (API Key)
- AI classification — Mode 2 (Claude Code Skill)
- Cross-pillar relation graph visualization
- Weekly Review AI Insight generation
- Browser extension (URL ingestion)
- 30-day Sparklines trend charts

---

## 8. Key Design Constraints

1. **Local-first**: All data stored locally; no network dependency (AI classification is optional and external)
2. **Immutable entries**: Entries are never modified after write; Events are the processing layer
3. **Review Gate is a hard lock**: Not a reminder — Cockpit is physically inaccessible until the review is completed
4. **Projects require no manual maintenance**: Aggregated via `match_rules`; human only calibrates during Review
5. **Classifier is an open interface**: Any external process can plug in via the two endpoints — not bound to any specific AI provider
