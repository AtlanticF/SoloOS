# SoloOS SQLite DDL

This document consolidates the current system data objects into an executable SQLite DDL specification.

Design goals:
- align with the current `schema` and `shared types`;
- improve data quality with `CHECK` constraints, foreign keys, and indexes;
- provide clear business-level comments directly in SQL for maintainability.

## 1) Data Object Overview

- `entries`: raw captured inputs (intake layer).
- `events`: structured business events parsed from `entries` (five pillars).
- `projects`: aggregation containers for event streams.
- `event_links`: graph edges between events (causal, related, sequential, etc.).
- `reviews`: periodic review records (currently centered on `weekly`).
- `insights`: structured insight artifacts parsed from input (fact/synthesis/vector).
- `agent_configs`: LLM connection settings (provider, model, key, etc.).
- `github_repo_bindings`: active repo→project mappings for Output pillar sync.
- `github_sync_state`: per-repo polling cursor and rate-limit state.
- `output_metadata`: one record per GitHub commit; lifecycle state + financial fields.

## 2) Executable SQLite DDL

```sql
-- SoloOS SQLite DDL
-- Notes:
-- 1) All time fields use Unix timestamps in seconds.
-- 2) JSON structures (quick_tags/match_rules/metadata/snapshot) are stored as TEXT.
-- 3) SQLite >= 3.37 is recommended for more stable CHECK/JSON behavior.

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- ============================================================================
-- 1. entries: input capture table
-- ============================================================================
CREATE TABLE IF NOT EXISTS entries (
  id          TEXT PRIMARY KEY NOT NULL,                    -- Business primary key (UUID)
  content     TEXT NOT NULL,                                -- Raw input content
  source      TEXT NOT NULL DEFAULT 'cli'                   -- Capture source
               CHECK (source IN ('cli', 'github', 'stripe', 'browser-ext')),
  status      TEXT NOT NULL DEFAULT 'pending'               -- Processing state: pending/processed
               CHECK (status IN ('pending', 'processed')),
  quick_tags  TEXT NOT NULL DEFAULT '[]'                    -- Quick tags (JSON string array)
               CHECK (json_valid(quick_tags)),
  created_at  INTEGER NOT NULL                              -- Creation timestamp (seconds)
);

-- ============================================================================
-- 2. projects: project aggregation table
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY NOT NULL,                -- Business primary key (UUID)
  name            TEXT NOT NULL,                            -- Project name
  status          TEXT NOT NULL DEFAULT 'active'            -- Lifecycle state
                   CHECK (status IN ('active', 'dormant', 'completed')),
  match_rules     TEXT NOT NULL DEFAULT '{}'                -- Auto-matching rules (JSON)
                   CHECK (json_valid(match_rules)),
  is_auto         INTEGER NOT NULL DEFAULT 1                -- 1=auto managed, 0=manual
                   CHECK (is_auto IN (0, 1)),
  first_event_at  INTEGER,                                  -- First event timestamp (nullable)
  last_event_at   INTEGER,                                  -- Last event timestamp (nullable)
  created_at      INTEGER NOT NULL                          -- Creation timestamp (seconds)
);

-- ============================================================================
-- 3. events: event fact table (primary analytics object)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY NOT NULL,                   -- Business primary key (UUID)
  entry_id     TEXT NOT NULL,                               -- Source entry
  pillar       TEXT NOT NULL                                -- Five-pillar dimension
               CHECK (pillar IN ('INPUT', 'OUTPUT', 'AUDIENCE', 'FINANCIAL', 'ENERGY')),
  project_id   TEXT,                                        -- Related project (nullable)
  impact_score INTEGER NOT NULL DEFAULT 1                   -- Impact score (1-10)
               CHECK (impact_score BETWEEN 1 AND 10),
  classifier   TEXT NOT NULL DEFAULT 'rule'                 -- Classification source
               CHECK (classifier IN ('rule', 'api-key', 'skill', 'human')),
  metadata     TEXT NOT NULL DEFAULT '{}'                   -- Extended context payload (JSON)
               CHECK (json_valid(metadata)),
  occurred_at  INTEGER NOT NULL,                            -- Event occurrence timestamp (seconds)
  created_at   INTEGER NOT NULL,                            -- Ingestion timestamp (seconds)

  FOREIGN KEY (entry_id) REFERENCES entries(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (project_id) REFERENCES projects(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- ============================================================================
-- 4. event_links: event relationship edges
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_links (
  source_event_id  TEXT NOT NULL,                           -- Edge source
  target_event_id  TEXT NOT NULL,                           -- Edge target
  link_type        TEXT NOT NULL,                           -- Relationship type (open enum, business-extensible)
  confidence       REAL NOT NULL DEFAULT 0.5                -- Confidence score [0,1]
                   CHECK (confidence >= 0 AND confidence <= 1),
  created_by       TEXT NOT NULL DEFAULT 'ai'               -- Relationship creator source
                   CHECK (created_by IN ('rule', 'ai', 'human')),

  PRIMARY KEY (source_event_id, target_event_id, link_type),
  FOREIGN KEY (source_event_id) REFERENCES events(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (target_event_id) REFERENCES events(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- ============================================================================
-- 5. reviews: periodic review records
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY NOT NULL,                  -- Business primary key (UUID)
  period        TEXT NOT NULL                               -- Review period type
                CHECK (period IN ('weekly', 'monthly', 'week')), -- Keeps backward compatibility for historical 'week'
  period_start  INTEGER NOT NULL,                           -- Period start timestamp (seconds)
  period_end    INTEGER NOT NULL,                           -- Period end timestamp (seconds)
  snapshot      TEXT NOT NULL DEFAULT '[]'                  -- Period snapshot (JSON array)
                CHECK (json_valid(snapshot)),
  reflection    TEXT,                                       -- Human reflection (nullable)
  ai_insight    TEXT,                                       -- AI-generated insight (nullable)
  completed_at  INTEGER,                                    -- Completion timestamp (nullable)
  created_at    INTEGER NOT NULL,                           -- Creation timestamp (seconds)

  CHECK (period_end >= period_start)
);

-- ============================================================================
-- 6. insights: structured insight persistence
-- ============================================================================
CREATE TABLE IF NOT EXISTS insights (
  id          TEXT PRIMARY KEY NOT NULL,                    -- Business primary key (UUID)
  entry_id    TEXT NOT NULL,                                -- Source entry
  event_id    TEXT,                                         -- Linked event (nullable)
  type        TEXT NOT NULL DEFAULT 'SEED'                  -- Insight type
              CHECK (type IN ('STRATEGY', 'TECHNIQUE', 'MARKET', 'SEED')),
  fact        TEXT NOT NULL DEFAULT '',                     -- Fact layer (what happened)
  synthesis   TEXT NOT NULL DEFAULT '',                     -- Synthesis layer (so what)
  vector      TEXT NOT NULL DEFAULT '',                     -- Action vector (now what)
  value_score INTEGER NOT NULL DEFAULT 5                    -- Value score (1-10)
              CHECK (value_score BETWEEN 1 AND 10),
  shelf_life  TEXT NOT NULL DEFAULT 'LONG'                  -- Shelf-life classification
              CHECK (shelf_life IN ('LONG', 'SHORT')),
  certainty   REAL NOT NULL DEFAULT 0                       -- Certainty score [0,1]
              CHECK (certainty >= 0 AND certainty <= 1),
  status      TEXT NOT NULL DEFAULT 'INBOX'                 -- Lifecycle status
              CHECK (status IN ('INBOX', 'ACTIVE', 'INCUBATING', 'PROJECTIZED')),
  project_id  TEXT,                                         -- Related project (nullable)
  cluster_id  TEXT,                                         -- Clustering group ID (nullable)
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,

  FOREIGN KEY (entry_id) REFERENCES entries(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (event_id) REFERENCES events(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (project_id) REFERENCES projects(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- ============================================================================
-- 7. agent_configs: LLM connection configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_configs (
  id          TEXT PRIMARY KEY NOT NULL,                    -- Config primary key (commonly single-row upsert)
  provider    TEXT NOT NULL                                 -- LLM provider
              CHECK (provider IN ('openai', 'anthropic', 'google', 'groq', 'ollama', 'custom')),
  model       TEXT NOT NULL,                                -- Model name (e.g. gpt-4o-mini)
  base_url    TEXT,                                         -- Custom gateway base URL (nullable)
  api_key     TEXT NOT NULL,                                -- API key (plaintext/encrypted depends on app layer)
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- ============================================================================
-- Indexes (balanced for query paths and write cost)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_entries_status_created_at
  ON entries(status, created_at);

CREATE INDEX IF NOT EXISTS idx_events_entry_id
  ON events(entry_id);

CREATE INDEX IF NOT EXISTS idx_events_pillar_occurred_at
  ON events(pillar, occurred_at);

CREATE INDEX IF NOT EXISTS idx_events_project_id_occurred_at
  ON events(project_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_reviews_period_range
  ON reviews(period, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_insights_entry_id
  ON insights(entry_id);

CREATE INDEX IF NOT EXISTS idx_insights_status_type_updated_at
  ON insights(status, type, updated_at);

CREATE INDEX IF NOT EXISTS idx_insights_project_id
  ON insights(project_id);

CREATE INDEX IF NOT EXISTS idx_event_links_source
  ON event_links(source_event_id);

CREATE INDEX IF NOT EXISTS idx_event_links_target
  ON event_links(target_event_id);

-- ============================================================================
-- 8. github_repo_bindings: repo → project mapping for Output pillar
-- ============================================================================
CREATE TABLE IF NOT EXISTS github_repo_bindings (
  id            TEXT PRIMARY KEY NOT NULL,
  repo_id       INTEGER NOT NULL UNIQUE,               -- GitHub numeric repository ID
  repo_name     TEXT NOT NULL,                          -- e.g. "soloos"
  repo_full_name TEXT NOT NULL,                         -- e.g. "matt/soloos"
  project_id    TEXT,                                   -- Nullable (unbound repos go DRAFT)
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- ============================================================================
-- 9. github_sync_state: per-repo polling cursor and rate-limit state
-- ============================================================================
CREATE TABLE IF NOT EXISTS github_sync_state (
  id                 TEXT PRIMARY KEY NOT NULL,
  repo_id            INTEGER NOT NULL UNIQUE,
  last_synced_sha    TEXT,                              -- SHA of last successfully ingested commit
  last_synced_at     INTEGER,                           -- Unix seconds of last successful sync
  next_safe_sync_at  INTEGER,                           -- Unix seconds; set when rate-limited
  sync_status        TEXT NOT NULL DEFAULT 'idle'
                     CHECK (sync_status IN ('idle','running','deferred_rate_limited','failed','success')),
  error_message      TEXT,                              -- Last error detail (nullable)
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

-- ============================================================================
-- 10. output_metadata: one row per GitHub commit (Output pillar asset)
-- ============================================================================
CREATE TABLE IF NOT EXISTS output_metadata (
  id                    TEXT PRIMARY KEY NOT NULL,
  event_id              TEXT NOT NULL UNIQUE,            -- FK to events.id
  repo_id               INTEGER NOT NULL,
  repo_name             TEXT NOT NULL,
  commit_sha            TEXT NOT NULL,
  commit_message        TEXT NOT NULL,
  author                TEXT NOT NULL,                   -- GitHub login or commit author name
  committed_at          INTEGER NOT NULL,                -- Unix seconds
  state                 TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (state IN ('DRAFT','ACTIVE','VALUATED','GHOST','ARCHIVED')),
  project_id            TEXT,                            -- Nullable after GHOST transition
  project_name_snapshot TEXT,                            -- Snapshot at binding time; immutable
  additions             INTEGER NOT NULL DEFAULT 0,
  deletions             INTEGER NOT NULL DEFAULT 0,
  files_changed         INTEGER NOT NULL DEFAULT 0,
  allocated_cost        TEXT NOT NULL DEFAULT '0.00',    -- Decimal string; immutable after write
  realized_revenue      TEXT NOT NULL DEFAULT '0.00',    -- Decimal string; updated by OUT_VALUATION_UP
  sync_version          INTEGER NOT NULL DEFAULT 1,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,

  FOREIGN KEY (event_id) REFERENCES events(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (project_id) REFERENCES projects(id)
    ON UPDATE NO ACTION ON DELETE NO ACTION,

  UNIQUE (repo_id, commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_output_metadata_state
  ON output_metadata(state);

CREATE INDEX IF NOT EXISTS idx_output_metadata_project_id
  ON output_metadata(project_id);

CREATE INDEX IF NOT EXISTS idx_output_metadata_committed_at
  ON output_metadata(committed_at);

COMMIT;
```

## 3) Implementation Notes

- If you want a strict "current migration parity" version, you can remove the additional `CHECK` constraints; this version intentionally adds governance constraints.
- `reviews.period` keeps `week` for historical seed compatibility; new writes should standardize on `weekly`.
- `event_links.link_type` is intentionally open-ended to avoid blocking future relationship semantics.
