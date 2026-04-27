# Output Pillar — Implementation-Ready Requirements

> Version: v1.0  Last updated: 2026-04-23
> Decisions locked: separate `output_metadata` table · rebind is forward-only · all 5 states visible · cost weighted by diff volume · GitHub REST API v3 · OpenAPI-first delivery

---

## 1. Core Product Logic

### 1.1 Definition

**Output** is a verified code asset derived from a GitHub commit.
It is the numerator in a project's ROI calculation and the intermediate medium by which Energy converts to Financial value.

- **Physical form**: one GitHub commit = one Output event record.
- **System role**: accumulates `allocated_cost` over time; when the project earns income, it gains `realized_revenue`.

### 1.2 Asset Attributes

Every Output record MUST carry:

| Field | Type | Note |
|---|---|---|
| `commit_sha` | string | Unique per repo; immutable after write |
| `repo_id` | integer (GitHub) | GitHub repository ID |
| `repo_name` | string | Snapshot from GitHub at sync time |
| `commit_message` | string | Snapshot; not editable |
| `author` | string | `login` from GitHub |
| `committed_at` | unix seconds | From `commit.author.date` |
| `additions` | integer | From GitHub stats |
| `deletions` | integer | From GitHub stats |
| `files_changed` | integer | From GitHub stats |
| `allocated_cost` | decimal string | Computed at ingestion; immutable |
| `realized_revenue` | decimal string | Updated on `OUT_VALUATION_UP`; default `"0.00"` |
| `state` | enum | See §2 |
| `project_id` | string (FK) | Nullable; bound at ingestion if repo has a binding |
| `project_name_snapshot` | string | Snapshot of project name at binding time |

---

## 2. Lifecycle State Machine

Output state is system-driven. Users never set state directly.

### 2.1 State Reference

| State | Plain-language meaning | Entry condition | Exit condition | Backend side effect |
|---|---|---|---|---|
| `DRAFT` | Captured, not yet linked to a project | `OUT_NEW_COMMIT` fires, no active repo binding | Binding created or matched | No cost accumulation |
| `ACTIVE` | Linked to a project, accumulating cost | Valid `project_id` binding exists at ingestion | Project deleted or archived | `allocated_cost` set at ingestion |
| `VALUATED` | Project earned money; this commit has positive ROI | `OUT_VALUATION_UP` fires on linked project | Project deleted or archived | `realized_revenue` updated |
| `GHOST` | Project was deleted; commit is an orphaned asset | Linked project physically deleted | — (terminal) | Project FK set to null; cost preserved |
| `ARCHIVED` | Project completed; commit is historical, static | Linked project status set to `archived` | — (terminal) | Excluded from dynamic cost rollups |

### 2.2 Transition Matrix

```
DRAFT      → ACTIVE     : repo binding exists at ingestion time
             (binding created after ingest: applies to next commit only — forward-only rule)

ACTIVE     → VALUATED   : OUT_VALUATION_UP fires on project_id
VALUATED   → ACTIVE     : (not allowed; valuation is monotone increasing)

ACTIVE     → GHOST      : project deleted
VALUATED   → GHOST      : project deleted

ACTIVE     → ARCHIVED   : project status → archived
VALUATED   → ARCHIVED   : project status → archived

DRAFT      → GHOST      : project deleted before any commit binds (no-op; DRAFT has no project_id)
DRAFT      → ARCHIVED   : not applicable
GHOST      → *          : terminal; no further transitions
ARCHIVED   → *          : terminal; no further transitions
```

### 2.3 Forward-Only Rebind Rule

When a user changes the repo→project mapping:
- **Historical commits**: state and `project_id` are **immutable**. No recalculation.
- **Future commits**: use the new binding from the next sync onward.
- UX MUST display: *"This change applies to future commits only. Past commits remain with their original project."*

---

## 3. Event Contracts

All Output-related business events MUST be persisted as records in the `events` table with `pillar = 'OUTPUT'` and a matching entry in `output_metadata`.

### 3.1 Event Definitions

| Event ID | Trigger | Idempotency Key | Backend Logic |
|---|---|---|---|
| `OUT_SYNC_INIT` | User creates first repo binding | `repo_id` | Fetch latest 30 commits from GitHub; ingest each as `OUT_NEW_COMMIT` |
| `OUT_NEW_COMMIT` | Polling detects new SHA | `repo_id + commit_sha` | Insert entry + event + output_metadata row; compute `allocated_cost`; derive state |
| `OUT_PROJ_REBIND` | User saves new repo→project mapping | `repo_id + timestamp` | Update `github_repo_bindings`; future commits only |
| `OUT_VALUATION_UP` | FINANCIAL event lands on a project | `project_id + financial_event_id` | Update `realized_revenue` + set `state = VALUATED` for all `ACTIVE` output_metadata rows on that project |
| `OUT_PROJ_DELETE` | Project deleted | `project_id` | Set `state = GHOST`, clear `project_id` FK, preserve all other fields |
| `OUT_PROJ_ARCHIVE` | Project status → archived | `project_id` | Set `state = ARCHIVED` for all `ACTIVE`/`VALUATED` rows on that project |

### 3.2 Idempotency Contract

- `OUT_NEW_COMMIT` MUST be de-duplicated by `(repo_id, commit_sha)` at write time.
- Retry on transient failures (network / 5xx) is safe; success responses MUST NOT trigger duplicate writes.
- All financial fields (`allocated_cost`, `realized_revenue`) are immutable after first write, except `realized_revenue` which is updated by `OUT_VALUATION_UP`.

---

## 4. GitHub API Integration Standard

### 4.1 Auth

- MVP: GitHub OAuth App personal access token (PAT) stored in `agent_configs` or a dedicated GitHub token field.
- Token stored server-side only; never sent to frontend.

### 4.2 Required Endpoints

| Purpose | Endpoint | Parameters |
|---|---|---|
| List user repos for binding | `GET /user/repos` | `type=owner`, paginate |
| Incremental commit sync | `GET /repos/{owner}/{repo}/commits` | `since={last_synced_at ISO}`, `per_page=100` |
| Commit detail (stats fallback) | `GET /repos/{owner}/{repo}/commits/{sha}` | Called when `additions`/`deletions` missing from list response |

### 4.3 Rate Limit Handling (MUST)

1. Read `X-RateLimit-Remaining` and `X-RateLimit-Reset` from every GitHub response.
2. If remaining ≤ 10, set `github_sync_state.next_safe_sync_at = reset_timestamp`; skip polling until then.
3. Manual sync triggered while `next_safe_sync_at` is in the future MUST return status `deferred_rate_limited` with the reset time displayed to the user.
4. Retry only on 5xx; do NOT retry on 403/429 — back off instead.

### 4.4 Cursor-Based Sync

- Persist `last_synced_sha` and `last_synced_at` per repo in `github_sync_state`.
- Use `since=last_synced_at` for incremental fetches.
- After successful ingest, update `last_synced_sha` and `last_synced_at`.

### 4.5 Polling Schedule (MVP)

- Background poll: every 30 minutes per bound repo.
- Manual trigger: `POST /api/output/sync` (user-initiated).
- Deduplication prevents double-processing even if both fire simultaneously.

---

## 5. Cost Allocation Algorithm

### 5.1 Formula (Weighted by Diff)

```
daily_burn  = user-configured base monthly burn ÷ 30
day_total_diff = sum of (additions + deletions) for all commits on the same calendar day (UTC)

allocated_cost(commit) =
  (commit.additions + commit.deletions) / day_total_diff × daily_burn
  — if day_total_diff = 0, fall back to: daily_burn / commit_count_for_day
```

### 5.2 MVP Simplification

- Default `daily_burn = 30.00` USD (configurable in Settings).
- Recalculation is NOT retroactive when `daily_burn` changes; only new commits use the new value.
- Store result as decimal string with 2 decimal places, e.g. `"4.75"`.

---

## 6. Data Model

### 6.1 `github_repo_bindings` Table

Stores active repo→project mappings.

```sql
CREATE TABLE github_repo_bindings (
  id          TEXT PRIMARY KEY NOT NULL,
  repo_id     INTEGER NOT NULL UNIQUE,       -- GitHub numeric repo ID
  repo_name   TEXT NOT NULL,                 -- e.g. "soloos"
  repo_full_name TEXT NOT NULL,              -- e.g. "matt/soloos"
  project_id  TEXT REFERENCES projects(id),  -- nullable (unbound)
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
```

### 6.2 `github_sync_state` Table

One row per repo; tracks polling cursor and rate-limit state.

```sql
CREATE TABLE github_sync_state (
  id                 TEXT PRIMARY KEY NOT NULL,
  repo_id            INTEGER NOT NULL UNIQUE,
  last_synced_sha    TEXT,                   -- SHA of most recently ingested commit
  last_synced_at     INTEGER,                -- Unix seconds of last successful sync
  next_safe_sync_at  INTEGER,                -- Unix seconds; set when rate-limited
  sync_status        TEXT NOT NULL DEFAULT 'idle'
                     CHECK (sync_status IN ('idle','running','deferred_rate_limited','failed','success')),
  error_message      TEXT,                   -- Last error detail (nullable)
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
```

### 6.3 `output_metadata` Table

One row per commit (linked to the `events` row via `event_id`).

```sql
CREATE TABLE output_metadata (
  id                    TEXT PRIMARY KEY NOT NULL,
  event_id              TEXT NOT NULL UNIQUE REFERENCES events(id),
  repo_id               INTEGER NOT NULL,
  repo_name             TEXT NOT NULL,
  commit_sha            TEXT NOT NULL,
  commit_message        TEXT NOT NULL,
  author                TEXT NOT NULL,
  committed_at          INTEGER NOT NULL,     -- Unix seconds
  state                 TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (state IN ('DRAFT','ACTIVE','VALUATED','GHOST','ARCHIVED')),
  project_id            TEXT REFERENCES projects(id),
  project_name_snapshot TEXT,
  additions             INTEGER NOT NULL DEFAULT 0,
  deletions             INTEGER NOT NULL DEFAULT 0,
  files_changed         INTEGER NOT NULL DEFAULT 0,
  allocated_cost        TEXT NOT NULL DEFAULT '0.00',   -- decimal string
  realized_revenue      TEXT NOT NULL DEFAULT '0.00',   -- decimal string
  sync_version          INTEGER NOT NULL DEFAULT 1,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,

  UNIQUE (repo_id, commit_sha)
);
```

---

## 7. User Interaction Flow

### Step 1 — Link GitHub Repo (one-time per repo)

1. User opens **Output** page → sees empty state with "Link a GitHub repo" CTA.
2. User clicks → `RepoProjectBindingDialog` opens:
   - Repo selector (lists via `GET /user/repos` via server proxy).
   - Project selector (lists existing projects).
   - Submit → `POST /api/output/repo-bindings`.
3. System triggers `OUT_SYNC_INIT` → fetches last 30 commits → ingest.
4. Output page populates with lifecycle summary and commit table.

### Step 2 — Background Operation

- User codes and pushes to GitHub normally.
- Server polls every 30 minutes → new commits appear in the table automatically.
- No user action required.

### Step 3 — Change Repo Mapping

1. User opens binding row → clicks "Change project".
2. `RepoProjectBindingDialog` shows: *"This change applies to future commits only. Past commits remain with their original project."*
3. User confirms → `POST /api/output/repo-bindings` (upsert).
4. Next sync uses new mapping; historical table unchanged.

### Step 4 — Project Deleted

- System transitions all linked Output records to `GHOST`.
- UI shows ghost badge + tooltip: *"Project deleted — these commits are orphaned assets."*
- Ghost outputs are excluded from project-level ROI but shown in the Output page.

### Step 5 — Project Archived

- System transitions all linked `ACTIVE`/`VALUATED` records to `ARCHIVED`.
- UI shows archived badge; archived rows are collapsed by default but accessible via filter.

---

## 8. Web Component Scheme

### 8.1 Component Hierarchy

```
OutputPage (apps/web/src/pages/Output.tsx)
├── OutputHeader
│   ├── Repo/project filter dropdowns
│   ├── Sync button (optimistic state for button only)
│   └── Last sync status + timestamp
├── OutputLifecycleSummary
│   └── 5 state counter badges (DRAFT · ACTIVE · VALUATED · GHOST · ARCHIVED)
├── OutputTimelineTable
│   └── Row: state badge · commit SHA/message · project · cost · revenue · date
└── RepoProjectBindingDialog (dialog, not inline)
```

`OutputStateExplanation` is delivered as inline tooltips on state badges, not a separate panel.

### 8.2 Interaction Constraints

- Optimistic UI: sync button only (loading spinner while `POST /api/output/sync` is pending).
- Financial values: never optimistic; always reflect server state.
- Empty state: show "Link a GitHub repo" CTA, not a blank table.
- Error state: show error message + retry button; never silent failure.
- Loading state: skeleton rows in `OutputTimelineTable`; not a full-page spinner.
- State labels: use plain English in badges (not enum strings). See §9 for copy.

### 8.3 File Targets

```
apps/web/src/pages/Output.tsx
apps/web/src/components/output/OutputHeader.tsx
apps/web/src/components/output/OutputLifecycleSummary.tsx
apps/web/src/components/output/OutputTimelineTable.tsx
apps/web/src/components/output/RepoProjectBindingDialog.tsx
apps/web/src/lib/api.ts  (add output.* methods)
```

---

## 9. API Definition

### 9.1 Style

- REST + JSON.
- UTC timestamps: ISO-8601 in query params; Unix seconds in response bodies (consistent with rest of API).
- Cursor-based pagination for event list (cursor = last seen `id`).
- Lifecycle state enum: `DRAFT | ACTIVE | VALUATED | GHOST | ARCHIVED` (uppercase).
- Money fields: decimal strings (e.g. `"12.50"`).

### 9.2 Endpoints

#### `GET /api/output/summary`

Returns aggregate counts and financial totals.

**Response**:
```json
{
  "counts": {
    "DRAFT": 2, "ACTIVE": 18, "VALUATED": 5, "GHOST": 1, "ARCHIVED": 0
  },
  "totals": {
    "allocated_cost": "412.50",
    "realized_revenue": "180.00"
  },
  "sync_status": "idle",
  "last_synced_at": 1713811200
}
```

#### `GET /api/output/events`

Paginated commit-level output list.

**Query params**: `cursor` (last id), `limit` (default 50, max 100), `repo_id`, `project_id`, `state`

**Response**:
```json
{
  "items": [ /* OutputEvent[] */ ],
  "next_cursor": "om_xyz" | null
}
```

#### `POST /api/output/sync`

Trigger manual sync for all bound repos (or a specific `repo_id`).

**Request**: `{ "repo_id": 123456 }` (optional; omit to sync all)

**Response**:
```json
{
  "accepted": true,
  "status": "running" | "deferred_rate_limited",
  "next_safe_sync_at": 1713814800 | null
}
```

#### `GET /api/output/sync-status`

**Response**:
```json
{
  "repos": [
    {
      "repo_id": 123456,
      "repo_full_name": "matt/soloos",
      "status": "idle",
      "last_synced_at": 1713811200,
      "last_synced_sha": "abc123",
      "next_safe_sync_at": null,
      "error_message": null
    }
  ]
}
```

#### `GET /api/output/repo-bindings`

List current repo→project bindings.

#### `POST /api/output/repo-bindings`

Create or update a binding (upsert by `repo_id`).

**Request**:
```json
{
  "repo_id": 123456,
  "repo_name": "soloos",
  "repo_full_name": "matt/soloos",
  "project_id": "proj_soloos"
}
```

**Response**: binding record + `"effective_from": "future_commits_only"`

### 9.3 OutputEvent DTO

```typescript
interface OutputEvent {
  id: string
  event_id: string
  repo_id: number
  repo_name: string
  commit_sha: string
  commit_message: string
  author: string
  committed_at: number           // unix seconds
  state: 'DRAFT' | 'ACTIVE' | 'VALUATED' | 'GHOST' | 'ARCHIVED'
  project_id: string | null
  project_name_snapshot: string | null
  additions: number
  deletions: number
  files_changed: number
  allocated_cost: string         // decimal string e.g. "4.75"
  realized_revenue: string       // decimal string e.g. "0.00"
  created_at: number
  updated_at: number
}
```

### 9.4 Error Model

All errors use:
```json
{ "code": "SYNC_IN_PROGRESS", "message": "A sync is already running.", "retryable": false, "hint": "Wait for it to finish." }
```

Required error codes for frontend handling:

| Code | HTTP | Meaning |
|---|---|---|
| `RATE_LIMITED` | 429 | GitHub API quota exhausted |
| `UNAUTHORIZED_GITHUB` | 401 | GitHub token missing or expired |
| `INVALID_BINDING` | 400 | Repo or project does not exist |
| `SYNC_IN_PROGRESS` | 409 | Another sync is already running for this repo |

---

## 10. MVP Non-Goals

The following are explicitly out of scope for v1 to keep understanding and implementation simple:

- GitHub App installation flow (OAuth App PAT is sufficient).
- Retroactive cost recalculation on rebind (forward-only).
- Per-file-type cost breakdown.
- Real-time WebSocket sync updates (polling is sufficient for MVP).
- Multiple GitHub accounts per user.
- Branch-level filtering (default branch only).
- `realized_revenue` fractional allocation across commits (total project revenue ÷ commit count is acceptable for v1).

---

## 11. Acceptance Criteria

### State Machine
- [ ] New commit with no binding → state is `DRAFT`
- [ ] New commit with valid binding → state is `ACTIVE`
- [ ] Rebind after initial commit → next new commit uses new binding; old commits unchanged
- [ ] `OUT_VALUATION_UP` fires → all `ACTIVE` commits on project become `VALUATED`
- [ ] Project deleted → all linked commits become `GHOST`; `project_id` set to null
- [ ] Project archived → all linked commits become `ARCHIVED`

### Sync
- [ ] `OUT_NEW_COMMIT` with duplicate `(repo_id, commit_sha)` → no-op (idempotent)
- [ ] Rate limit hit → `sync_status = deferred_rate_limited`; manual sync returns `deferred_rate_limited` with reset time
- [ ] `OUT_SYNC_INIT` → last 30 commits ingested with correct `allocated_cost`

### API
- [ ] `GET /api/output/summary` returns correct counts by state
- [ ] `POST /api/output/repo-bindings` response includes `effective_from: "future_commits_only"`
- [ ] Error responses match `{ code, message, retryable, hint }` shape

### UI
- [ ] Output page shows all 5 state counters
- [ ] `RepoProjectBindingDialog` shows forward-only copy before save
- [ ] Empty state shows "Link a GitHub repo" CTA
- [ ] Manual sync button is optimistic (spinner during request); financial values do not change until server responds
