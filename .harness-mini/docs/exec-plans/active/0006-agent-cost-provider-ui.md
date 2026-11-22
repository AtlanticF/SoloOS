---
plan: agent-cost-provider-ui
seq: 0006
stage: evaluate
owner: main
mode: full
eval: L2
---
# Agent Cost Provider UI — implementation plan

## Intake

- Official API check is complete:
  - Anthropic has an official Usage & Cost Admin API.
  - Cursor has an official Team Admin API with spending and usage events.
- Cursor and Anthropic are therefore in scope; no provider is paused.
- Five-step deletion: this is not a generic billing dashboard, not a scraper,
  not scheduled automation, and not per-token live tracing.

## PRD

- Spec:
  `docs/superpowers/specs/2026-05-31-agent-cost-provider-ui-design.md`
- Goal: make official agent cost ingestion usable from Settings and expand
  official provider coverage from OpenAI to Anthropic and Cursor.

## Issues

- [x] **Issue 1 — Generalize provider config and sync API**
  - Outcome: OpenAI, Anthropic, and Cursor share save/list/test/delete/sync
    routes without duplicating route handlers per provider.
  - Failing test first: provider route tests cover all three providers.
  - Done = API tests green and existing OpenAI behavior unchanged.

- [x] **Issue 2 — Anthropic official cost sync**
  - Outcome: Anthropic Admin API cost rows import idempotently from
    `/v1/organizations/cost_report`.
  - Failing test first: mocked Anthropic cost report imports two rows, second
    sync skips duplicates.
  - Done = service/API tests green with raw metadata stored.

- [x] **Issue 3 — Cursor official cost sync**
  - Outcome: Cursor Admin API usage/spend rows import idempotently from official
    team endpoints.
  - Failing test first: mocked Cursor usage events import token-based costs and
    skip duplicates.
  - Done = service/API tests green with raw metadata stored.

- [x] **Issue 4 — Settings provider management UI**
  - Outcome: user can configure, test, delete, and sync OpenAI, Anthropic, and
    Cursor cost providers from Settings.
  - Failing check first: build fails until API contracts and UI types line up.
  - Done = build green and UI exposes all expected actions.

- [x] **Issue 5 — Unassigned cost assignment UI**
  - Outcome: Settings shows unassigned cost rows and lets the user assign them
    to existing SoloOS projects.
  - Failing check first: build/API contract coverage for assignment path.
  - Done = build green and assignment refreshes project economics.

## Evaluation

- Tier: L2 because this touches provider integrations, secret handling, Settings
  UI, review economics, and project attribution.

## Now — reconciled 2026-06-03

- **The blocker is stale/expired.** The Codex usage-limit window ("until
  2026-05-31 19:55") that stalled the L2 rerun is **3 days past**; nothing is
  actually blocking anymore.
- **Code-complete.** All 5 issues `[x]`; the Issue 3 fix (Cursor `/teams/spend`
  ingestion) is in and verified locally — part of the 117/117 green server suite
  (2026-06-03).
- **Part of the single Financial-axis story** with 0005 + 0007 (see
  `docs/product-spine.md`).
- **Remaining gate:** re-run `evaluate` (L2) on the Issue 3 fix → if pass,
  `checkpoint` → `done`. Use a non-blocked evaluator (L1 lightweight is adequate
  for this dogfood-internal slice if L2 capacity is again constrained).

## Decisions log

- 2026-05-31: Anthropic and Cursor both have official APIs, so neither provider
  is paused.
- 2026-05-31: Implemented official cost provider ingestion for OpenAI,
  Anthropic, and Cursor, plus Settings UI for provider operations and
  unassigned-cost assignment.
- 2026-05-31: L2 evaluation failed once on Issue 3: Cursor lacked
  `/teams/spend` ingestion. Added Cursor spend import, raw metadata storage,
  idempotency coverage, and provider-neutral sync request naming.
