---
plan: agent-cost-ledger
seq: 0005
stage: implement
owner: main
mode: full
eval: L2
---
# Agent Cost Ledger — implementation plan

## Intake

- Five-step deletion: this is not a universal billing dashboard, not a realtime
  token monitor, not a Claude/Codex scraper, and not per-commit token
  attribution.
- Riskiest assumption: provider cost rows can be mapped to SoloOS projects well
  enough to support weekly decisions. The first walking skeleton proves the
  product loop with manual cost entries before relying on provider APIs.

## Problem

SoloOS must account for AI agent spend as a project cost. A project that produces
commits and apparent momentum can still be economically bad if agent spend
exceeds return. The feature adds a local Agent Cost Ledger so weekly review can
show real project economics: return minus output cost minus agent cost.

## PRD

- Spec: `docs/superpowers/specs/2026-05-31-agent-cost-ledger-design.md`
- Goal: import or record AI agent cost, attribute it to SoloOS projects, and
  surface it in weekly review decisions.
- Out of scope:
  - Anthropic official Admin API implementation in MVP.
  - Unofficial Claude/Codex usage scraping.
  - Per-commit token attribution.
  - Multi-currency conversion.
  - Cloud/team/accounting workflows.

## Acceptance criteria

- [ ] Agent cost tables exist for provider configs, cost events, project mappings,
      and sync status where needed. Machine check: migration/schema tests.
- [ ] Manual cost events can be created, listed, assigned to a project, and
      included in review summaries. Machine check: API tests.
- [ ] OpenAI official cost provider config can be saved, masked, tested, and
      deleted without exposing the secret to the frontend. Machine check: API
      tests with fetch mocks.
- [ ] OpenAI cost sync imports official cost rows idempotently, records sync
      status, and saves unmapped rows as unassigned. Machine check: service/API
      tests with fetch mocks.
- [ ] Provider grouping keys can be mapped to SoloOS projects, with deterministic
      precedence and ambiguity handling. Machine check: service tests.
- [ ] Weekly review snapshot includes assigned/unassigned agent cost and requires
      a project decision when agent cost is non-zero. Machine check: API tests;
      human check for UI copy clarity.
- [ ] Project economics view can compute
      `financial_return - output_allocated_cost - agent_cost`. Machine check:
      service tests; human check for UI readability.

## Issues

- [x] **Issue 1 — Schema and types for Agent Cost Ledger**
  - Outcome: shared types, Drizzle tables, and migration exist for provider
    configs, cost events, mappings, and sync metadata.
  - Failing test first: schema/type test proves cost event rows can represent
    `official_api`, `official_export`, `sdk_estimate`, and `manual` sources with
    nullable project attribution.
  - Layer footprint: Types -> Repo.
  - Done = migration/schema test green + shared exported types compile.

- [x] **Issue 2 — Manual cost event walking skeleton**
  - Outcome: user can create and list a manual agent cost event through the API.
  - Failing test first: `POST /api/agent-cost/events` creates `source = manual`;
    `GET /api/agent-cost/events` returns it with amount, currency, usage window,
    provider label, and optional project.
  - Layer footprint: Types -> Repo -> Service -> Runtime.
  - Done = API tests green + manual events are distinguishable from official
    records.

- [x] **Issue 3 — Review summary includes manual agent cost**
  - Outcome: current weekly review snapshot includes total, assigned, unassigned,
    and project-level agent cost from manual events.
  - Failing test first: create cost events in the current week, call
    `/api/reviews/current`, and assert the snapshot contains agent cost totals.
  - Layer footprint: Service -> Runtime.
  - Done = review API test green + zero-cost weeks keep existing review behavior.

- [x] **Issue 4 — OpenAI provider config and connection test**
  - Outcome: OpenAI cost provider config can be saved, masked, tested, and
    deleted.
  - Failing test first: mock OpenAI Costs API response; provider test succeeds
    only when the endpoint can be queried and returns structured cost data.
  - Layer footprint: Config -> Repo -> Service -> Runtime.
  - Done = API tests green + invalid credentials and missing permission produce
    distinct error codes.

- [x] **Issue 5 — OpenAI cost sync idempotency**
  - Outcome: date-range sync imports OpenAI official cost rows without duplicates
    and records sync status.
  - Failing test first: mock two cost rows, sync twice, assert one stored copy per
    idempotency key and accurate `imported/skipped/unassigned` counts.
  - Layer footprint: Repo -> Service -> Runtime.
  - Done = service/API tests green + raw provider metadata is stored.

- [x] **Issue 6 — Project mapping rules and unassigned queue**
  - Outcome: provider grouping keys can map future cost rows to SoloOS projects;
    imported unmapped rows can be assigned later.
  - Failing test first: provider_project_id mapping beats api_key_id mapping,
    api_key_id beats line_item, same-precedence conflicts leave a row unassigned
    with an ambiguity warning.
  - Layer footprint: Types -> Repo -> Service -> Runtime -> UI.
  - Done = service/API tests green + UI shows unassigned rows and assignment
    action.

- [x] **Issue 7 — Weekly review decision gate for agent cost**
  - Outcome: review UI surfaces agent cost and requires a project decision when
    cost is non-zero.
  - Failing test first: review completion without a decision fails when snapshot
    agent cost is non-zero; succeeds when a valid decision is included.
  - Layer footprint: Service -> Runtime -> UI.
  - Done = API tests green + user can complete the review with
    `continue | pause | kill | double_down`.

- [x] **Issue 8 — Project economics display**
  - Outcome: Output/project screens show project-level economics including agent
    cost.
  - Failing test first: service test computes project margin from financial
    return, output allocated cost, and agent cost.
  - Layer footprint: Service -> Runtime -> UI.
  - Done = build green + UI highlights negative-margin projects without blocking
    normal navigation.

## Vertical slices

1. Manual cost skeleton: Issues 1 -> 2 -> 3.
2. Official OpenAI ingestion: Issues 4 -> 5.
3. Attribution quality: Issue 6.
4. Review decision loop: Issue 7.
5. Project economics display: Issue 8.

## Evaluation

- Tier: L2 because this touches schema, API contracts, secret handling, provider
  integrations, review behavior, and project economics.
- Evaluator must verify tests, provider secret masking, idempotency, and that no
  unofficial Claude/Codex scraping was introduced.

## Now (resume here) — reconciled 2026-06-03

- **Code-complete.** All 8 issues `[x]`; verified against the live codebase:
  117/117 server tests green, shared+server `tsc` clean (2026-06-03).
- **This is part of ONE story, not three.** 0005 (ledger) + 0006 (provider UI) +
  0007 (personal connectors) are a single product slice: *"the Financial axis —
  account for AI agent spend per project so the weekly Review shows true
  economics (return − output cost − agent cost)."* See `docs/product-spine.md`.
- **Remaining gate (lifecycle, not code):** run `evaluate` at the declared **L2**
  → `checkpoint` → `done` → move to `completed/`. No new building required; the
  loop was just never closed. Scope was already (correctly) bounded in Intake —
  resist further provider expansion before closing.

## Next

- After Issue 3 is green, implement OpenAI provider configuration as the first
  official API integration.

## Decisions log

- 2026-05-31: PRD written in
  `docs/superpowers/specs/2026-05-31-agent-cost-ledger-design.md`.
- 2026-05-31: MVP official provider is OpenAI Costs API; Anthropic/Claude/Codex
  use manual cost records unless official accessible cost APIs are configured in
  a later iteration.
- 2026-05-31: Stage advanced to `issues`; atomic TDD-ready issues listed here.
- 2026-05-31: Stage advanced to `implement`; start with Issue 1 using TDD.
- 2026-05-31: Issue 1 green. Added shared agent-cost types, Drizzle tables, and
  migration `0008_agent_cost_ledger`; verified with server tests and root build.
- 2026-05-31: Issue 2 green. Added `/api/agent-cost/events` manual cost create
  and list APIs backed by the ledger table; verified with server tests and root
  build.
- 2026-05-31: Issue 3 green. Weekly review now returns `agent_cost_summary`
  with total, assigned, unassigned, and project-level manual cost for the active
  period; verified with server tests and root build.
- 2026-05-31: Issue 4 green. Added OpenAI cost provider save/list/test/delete
  APIs with masked secrets and a live connection check against the official
  Costs endpoint; verified with server tests and root build.
- 2026-05-31: Issue 5 green. Added OpenAI official cost sync with deterministic
  idempotency keys, sync-state tracking, and unmapped-row counts; verified with
  server tests and root build.
- 2026-05-31: Issue 6 green. Added project mapping creation, deterministic
  precedence (`provider_project_id` > `api_key_id` > `line_item`), unassigned
  event filtering, and manual project assignment; verified with server tests and
  root build.
- 2026-05-31: Issue 7 green. Weekly review completion now requires an
  `agent_cost_decision` when agent cost is non-zero, and Review/ReviewGate UI
  can submit the decision; verified with server tests and root build.
- 2026-05-31: Issue 8 green. Added project economics computation and Output
  project-card display for agent cost, output cost, and margin; verified with
  server tests and root build.
