This document is the product and technical reference for **Association** in SoloOS: a single, consistent source of truth from product intent through to implementation.

---

# SoloOS Association: Product and Technical Design (PRD / TDD)

> Cross-references: [pillar-output-prd.md](./pillar-output-prd.md) — Output lifecycle, cost algorithm, and event contracts.

---

## 1. Definition

**Association** is the logical link between **Input** (cause) and **Output** (effect). It records how a specific code commit (an Output event stored in `output_metadata`) was driven by a specific cognitive insight (an Insight event).

---

## 2. Core Logic and Formulas

### 2.1 Causal-closure: when is an Insight "CONVERTED"?

Let $\mathcal{I}$ be the set of insights and $\mathcal{A}$ the set of associations. An insight transitions to `CONVERTED` if and only if it has at least one `CONFIRMED` association that originates from it:

$$
\forall\, i \in \mathcal{I}:\quad
\mathrm{status}(i) = \texttt{CONVERTED}
\iff
\exists\, a \in \mathcal{A}:\;
\mathrm{source\_id}(a) = \mathrm{id}(i)
\;\land\;
\mathrm{status}(a) = \texttt{CONFIRMED}.
$$

*Plain language: `CONVERTED` is set on the insight whenever it has at least one confirmed causal link to an output commit.*

### 2.2 Insight-level cost attribution

> **Terminology note.** The Output PRD (§5) defines `output_metadata.allocated_cost` — the cost of a single commit computed at ingestion time via a diff-weighted daily-burn formula. That value is an output-level metric. The formula below is a **separate, higher-level** calculation: distributing already-computed output costs back to the insights that drove them. These are two distinct quantities; only §2.2 here is about insights.

Let $\mathcal{A}^+(i) = \{ a \in \mathcal{A} \mid \mathrm{source\_id}(a) = \mathrm{id}(i) \land \mathrm{status}(a) = \texttt{CONFIRMED} \}$ be the set of confirmed associations for insight $i$.

For each association $a$, let $O(a)$ denote the target output (commit). Let $\mathrm{Cost}(O)$ be that commit's `allocated_cost` (decimal, as stored in `output_metadata`). Let $N(O)$ be the count of **distinct** insights that each have at least one `CONFIRMED` association to output $O$.

The **insight-attributed cost** for insight $i$ is:

$$
\mathrm{InsightCost}(i)
= \sum_{a \in \mathcal{A}^+(i)}
\frac{\mathrm{Cost}\bigl(O(a)\bigr)}{N\bigl(O(a)\bigr)}.
$$

*Plain language: each confirmed output's cost is divided equally among all insights confirmed as causes of that output. An insight accumulates its share across every output it is credited for.*

**Edge: $N(O) = 0$** — impossible by construction (an association cannot be `CONFIRMED` without a `source_id`), so the denominator is always ≥ 1 when the sum is non-empty.

---

## 3. Data Model

### 3.1 `associations` Table (SQLite)

```sql
CREATE TABLE associations (
    id          TEXT PRIMARY KEY NOT NULL,   -- e.g. "assoc_<ulid>"
    project_id  TEXT NOT NULL,               -- owning project
    source_id   TEXT NOT NULL,               -- Input side: insights.id
    target_id   TEXT NOT NULL,               -- Output side: output_metadata.id

    -- AI-suggested metadata (nullable until agent runs)
    match_score REAL CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 1)),
    reasoning   TEXT,                        -- LLM rationale for the link

    -- State machine
    status      TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
                CHECK (status IN ('PENDING_REVIEW', 'CONFIRMED', 'REJECTED')),

    created_at  INTEGER NOT NULL,            -- Unix seconds
    updated_at  INTEGER NOT NULL,            -- Unix seconds

    UNIQUE (source_id, target_id)            -- idempotency; prevents duplicate suggestions
);

CREATE INDEX idx_assoc_project_status ON associations (project_id, status);
CREATE INDEX idx_assoc_target         ON associations (target_id);
CREATE INDEX idx_assoc_source         ON associations (source_id);
```

**Field notes:**

| Field | Constraint | Note |
|---|---|---|
| `source_id` | FK → `insights.id` | Nullable FK; on insight delete, delete or mark association `REJECTED` |
| `target_id` | FK → `output_metadata.id` | Immutable after creation |
| `match_score` | `[0, 1]` or NULL | NULL until the agent processes; populated on creation |
| `status` | `PENDING_REVIEW \| CONFIRMED \| REJECTED` | User-writable via review endpoints |

### 3.2 Association Status State Machine

```
PENDING_REVIEW  →  CONFIRMED  :  user confirms (or batch-confirm)
PENDING_REVIEW  →  REJECTED   :  user rejects (or batch-reject)
CONFIRMED       →  (terminal) :  no further user transitions
REJECTED        →  (terminal) :  no further user transitions
```

*Side effects triggered on CONFIRMED:* insight `status` → `CONVERTED`; `InsightCost(i)` recomputed (see §2.2).

---

## 4. Workflows and BDD

### 4.1 Asynchronous association generation (AI agent worker)

**Trigger:** an `OUT_NEW_COMMIT` event is processed (see Output PRD §3.1) and the project has at least one insight with `status = 'ACTIVE'`.

**Steps:**

1. Load all insights for the project where `status = 'ACTIVE'`.
2. Load the `output_metadata` rows produced in this sync.
3. Call the LLM for semantic matching against insight synthesis text and commit messages.
4. For each suggested pair `(insight_id, output_metadata_id)`, upsert into `associations` with `status = 'PENDING_REVIEW'`, ignoring conflicts on `UNIQUE (source_id, target_id)`.

**BDD — AI auto-match**

- **Given** project `P` has insight `I` with `status = 'ACTIVE'` and `synthesis = 'Implement login'`, and a newly synced commit `O` with `commit_message = 'feat: auth logic'`.
- **When** the async association agent runs for project `P` after the sync.
- **Then** the system inserts one `associations` row with:
  - `source_id = I.id`, `target_id = O.id`
  - `status = 'PENDING_REVIEW'`
  - `match_score ∈ [0, 1]`
  - `reasoning` non-empty

**BDD — duplicate suppression**

- **Given** `associations` already has a `PENDING_REVIEW` row with `(source_id = I.id, target_id = O.id)`.
- **When** the agent runs again for the same pair.
- **Then** no new row is inserted (idempotent by `UNIQUE (source_id, target_id)`).

### 4.2 User review actions

**BDD — Confirm**

- **Given** association `A` has `status = 'PENDING_REVIEW'`, `source_id` → insight `I`, `target_id` → output `O`.
- **When** the user confirms `A`.
- **Then:**
  1. `A.status` → `CONFIRMED`, `A.updated_at` → now.
  2. `I.status` → `CONVERTED`, `I.updated_at` → now.
  3. `InsightCost(I)` is recomputed per §2.2 using `O.allocated_cost` and current `N(O)`.

**BDD — Reject**

- **Given** association `A` has `status = 'PENDING_REVIEW'`.
- **When** the user rejects `A`.
- **Then:**
  1. `A.status` → `REJECTED`, `A.updated_at` → now.
  2. `I.status` is **unchanged** (remains `ACTIVE`; rejection does not convert the insight).

---

## 5. API

> **Implementation note:** The paths below follow SoloOS REST conventions (`/api/<resource>`, no version prefix). Align with server route registration in `apps/server/src/index.ts`.

### 5.1 List associations

- **GET** `/api/associations`
- **Query params:**
  - `project_id` — required; filter by project
  - `status` — optional; one of `PENDING_REVIEW | CONFIRMED | REJECTED`; default: all
  - `cursor` — optional; cursor-based pagination (last seen `id`)
  - `limit` — optional; default 50, max 100
- **Response:** `{ items: Association[], next_cursor: string | null }`

Where `Association` includes joined `source` (Insight summary) and `target` (OutputEvent summary).

### 5.2 Confirm

- **POST** `/api/associations/:id/confirm`
- **Body:** `{}`
- **Effect:** apply `CONFIRMED` transition and trigger insight/cost updates (§4.2 BDD Confirm).
- **Response:** `{ association: Association, insight: Insight }`

### 5.3 Reject

- **POST** `/api/associations/:id/reject`
- **Body:** `{}`
- **Effect:** apply `REJECTED` transition (§4.2 BDD Reject).
- **Response:** `{ association: Association }`

### 5.4 Batch review

- **POST** `/api/associations/batch-review`
- **Body:**

```json
{
  "confirm_ids": ["assoc_abc", "assoc_def"],
  "reject_ids": ["assoc_ghi"]
}
```

- **Response:**

```json
{
  "confirmed": 2,
  "rejected": 1,
  "errors": []
}
```

`errors` is an array of `{ id, code, message }` objects for any IDs that could not be processed (e.g. already in terminal state).

### 5.5 Association DTO

```typescript
interface Association {
  id: string
  project_id: string
  source_id: string               // insights.id
  target_id: string               // output_metadata.id
  match_score: number | null      // [0, 1]
  reasoning: string | null
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED'
  source: {                       // joined Insight summary
    id: string
    synthesis: string
    status: string
  }
  target: {                       // joined OutputEvent summary
    id: string
    commit_sha: string
    commit_message: string
    allocated_cost: string        // decimal string from output_metadata
    committed_at: number          // unix seconds
  }
  created_at: number
  updated_at: number
}
```

---

## 6. UI / UX (summary)

### 6.1 Output detail context (inline)

Within the commit detail panel (slide-out sheet from `OutputTimelineTable`), if the commit has any `PENDING_REVIEW` associations, show:

> **AI suggested link:** "Implement solopreneur intake logic" (match: 87%)
> [Confirm] [Reject]

Confirmed and rejected associations may be shown in a collapsed "Past decisions" section.

### 6.2 Review mode (dedicated view)

A vertical flow listing all `PENDING_REVIEW` records for a project:

- Left column: Insight `synthesis` text (with creation date).
- Right column: Output `commit_message` + `committed_at` + repo name.
- Center: `reasoning` from the LLM + `match_score` badge.
- Footer: [Confirm all] and [Skip for now] shortcuts.

---

## 7. Edge Cases

- **Duplicate suggestions:** the `UNIQUE (source_id, target_id)` constraint on `associations` makes the upsert idempotent. The agent MUST use `INSERT OR IGNORE` (SQLite) or equivalent.
- **Source insight deleted:** cascade-delete the association row, or set `status = 'REJECTED'` with a system-generated `reasoning = 'Source insight deleted'`. Do not leave orphaned `source_id` references.
- **Target output deleted:** if `output_metadata` rows are ever hard-deleted, cascade-delete or mark associated rows. In practice, Output records are terminal-state only (not deleted), so this is a defensive guard.
- **Model quality feedback:** track the `REJECTED` rate and the distribution of `match_score` values over time. Surface this as a metric for tuning LLM prompt thresholds.
- **Insight already CONVERTED:** if `I.status` is already `CONVERTED` when a second association is confirmed, the confirm still applies (multiple confirmed links are valid). Only a `REJECTED` confirmation prevents conversion; `CONVERTED` is monotone — it is never reverted by a rejection.

---

## 8. Acceptance Criteria

### State machine
- [ ] Confirm action sets `A.status = CONFIRMED` and `I.status = CONVERTED`
- [ ] Reject action sets `A.status = REJECTED` and leaves `I.status` unchanged
- [ ] A second confirm on an already-`CONFIRMED` association returns an error with code `ASSOCIATION_TERMINAL`
- [ ] `InsightCost(I)` increases by `Cost(O) / N(O)` after each new confirmation involving `O`

### Idempotency
- [ ] Agent inserting the same `(source_id, target_id)` pair twice → single row in `associations`
- [ ] Batch confirm with an already-`CONFIRMED` id → included in `errors` array, other IDs proceed

### API
- [ ] `GET /api/associations?project_id=P&status=PENDING_REVIEW` returns only pending rows for `P`
- [ ] `POST /api/associations/:id/confirm` response includes updated `insight.status = 'CONVERTED'`
- [ ] `POST /api/associations/batch-review` with mixed valid/invalid IDs → partial success + errors array
