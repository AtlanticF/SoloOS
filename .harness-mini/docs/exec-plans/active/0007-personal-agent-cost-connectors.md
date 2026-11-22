---
plan: personal-agent-cost-connectors
seq: 0007
stage: evaluate
owner: main
mode: full
eval: L2
---
# Personal Agent Cost Connectors — implementation plan

## Intake

- Team accounts with official admin APIs continue to use provider billing APIs.
- Personal accounts often lack admin APIs, so they need a separate connector path.
- Candidate personal-account connectors:
  - Claude Code / Claude Agent SDK: official SDK and CLI JSON output expose
    token usage and estimated cost, but docs state these are not authoritative
    billing values.
  - Cursor CLI: official CLI supports structured JSON / stream-JSON, but the
    documented output schema does not expose cost or token usage fields.
  - Codex CLI: official CLI supports local execution and JSON event output, but
    subscription-plan cost is not an authoritative billing API.
- Core risk: mixing authoritative team billing data with personal local estimates
  can mislead project ROI unless the product marks source quality clearly.

## PRD

- Spec:
  `docs/superpowers/specs/2026-05-31-personal-agent-cost-connectors-design.md`
- Goal: add personal-account agent cost support by letting users configure paid
  provider subscriptions, detect local agent availability, manually sync local
  metadata, and allocate daily subscription cost into project economics.
- Out of scope:
  - Background daemon or continuous local monitoring.
  - Remote execution of arbitrary local commands.
  - Uploading or storing prompt, response, or transcript content.
  - Inferring exact personal billing from provider private account pages.
  - Currency conversion beyond storing the configured currency.
  - Per-message or per-token ROI allocation for personal subscription plans.

## Issues

- [x] **Issue 1 - Personal subscription schema and shared types**
  - Outcome: shared types and persistence can represent provider-scoped
    personal subscriptions with account type, billing status, monthly amount,
    currency, effective dates, source, confidence, and enabled state.
  - Failing test first: schema/type test proves paid and free personal
    subscriptions serialize through the shared contract and existing official
    provider config types still compile.
  - Layer footprint: Types -> Repo.
  - Done = migration/schema/type tests green.

- [x] **Issue 2 - Personal subscription CRUD API**
  - Outcome: Settings can create, list, update, disable, and delete personal
    provider subscriptions without touching official provider config behavior.
  - Failing test first: API tests cover create/list/update/disable/delete for
    Claude, Cursor, and Codex personal subscriptions.
  - Layer footprint: Types -> Repo -> Service -> Runtime.
  - Done = API tests green and existing official provider tests unchanged.

- [x] **Issue 3 - Daily personal cost calculation**
  - Outcome: paid subscriptions produce daily average cost; free/unpaid
    subscriptions produce zero; disabled subscriptions are excluded.
  - Failing test first: service tests cover paid, free, disabled, and
    date-bounded subscriptions.
  - Layer footprint: Service.
  - Done = cost calculation tests green.

- [x] **Issue 4 - Local connector detection**
  - Outcome: server reports installed/missing/unsupported detection state for
    Claude, Cursor, and Codex through whitelisted commands/paths only.
  - Failing test first: command/path mocks prove detection never executes
    arbitrary user-provided commands.
  - Layer footprint: Config -> Service -> Runtime.
  - Done = detection API/service tests green.

- [x] **Issue 5 - Manual local activity metadata sync**
  - Outcome: user-triggered sync imports local agent activity metadata only:
    provider, occurred_at, project_path, event_count, and optional token fields.
  - Failing test first: parser/service tests import metadata fixtures and reject
    prompt/response/transcript fields.
  - Layer footprint: Types -> Repo -> Service -> Runtime.
  - Done = sync tests green with no transcript persistence.

- [x] **Issue 6 - Daily allocation into project and unallocated costs**
  - Outcome: same-day personal subscription cost is allocated by project activity
    share; no-activity or unmatched activity becomes unallocated personal cost.
  - Failing test first: service tests cover proportional allocation, rounding,
    idempotency, and unallocated rows.
  - Layer footprint: Repo -> Service.
  - Done = allocation tests green and agent cost ledger idempotency preserved.

- [x] **Issue 7 - Cost summary source breakdown**
  - Outcome: review/project economics summaries expose total agent cost plus
    official API, allocated personal subscription, and unallocated personal
    subscription components.
  - Failing test first: API tests create mixed official/personal cost rows and
    assert the split is visible without changing total cost math.
  - Layer footprint: Service -> Runtime.
  - Done = API tests green and existing weekly review behavior unchanged.

- [x] **Issue 8 - Settings UI for personal connectors**
  - Outcome: Settings lets the user configure personal subscriptions, see local
    connector detection state, run manual sync, and inspect cost-source split.
  - Failing check first: build fails until shared/API contracts and UI types
    line up.
  - Layer footprint: Runtime -> UI.
  - Done = build green plus local UI smoke test for the Settings journey.

## Evaluation

- Tier: L2 because this affects financial semantics, local agent execution,
  permissions, and trust boundaries.

## Now — reconciled 2026-06-03

- **Code-complete.** All 8 issues `[x]`; verified in the 117/117 green server
  suite, shared+server `tsc` clean (2026-06-03).
- **One open verification:** Issue 8's **browser smoke was never done** (the dev
  port 3000 was occupied at the time). The Settings journey for personal
  connectors is built + API-tested but not yet eyeballed in the running app.
- **Part of the single Financial-axis story** with 0005 + 0006 (see
  `docs/product-spine.md`).
- **Remaining gate:** complete the browser smoke (start the app, walk the
  Settings → personal connectors → manual sync → cost-source split journey),
  then `evaluate` (L2) → `checkpoint` → `done`.

## Decisions log

- 2026-05-31: Opened intake for split team-vs-personal agent cost ingestion.
- 2026-05-31: Personal-account local agent estimates are allowed to count as
  product cost because this is the only available cost signal for individual
  accounts. The product must still preserve source and confidence metadata so
  official API costs and local estimates remain distinguishable.
- 2026-05-31: Personal accounts use a one-time user configuration flow for MVP:
  account type and monthly subscription fee are confirmed by the user, then
  SoloOS computes a daily average cost. Free accounts do not contribute cost.
- 2026-05-31: Personal subscription daily cost is allocated to projects by each
  project's share of same-day agent activity. If activity cannot be attributed,
  the cost remains unallocated instead of being forced onto a project.
- 2026-05-31: MVP personal activity ingestion uses local CLI/SDK session or
  execution metadata only: provider, occurred_at, project_path, event_count, and
  optional tokens. SoloOS must not ingest prompt or response content. Project
  attribution starts with cwd/project_path matching.
- 2026-05-31: MVP local connector scope is detect-and-manual-sync only. The
  server may run whitelisted provider commands or read whitelisted local paths,
  but must not expose arbitrary local command execution.
- 2026-05-31: Personal subscriptions are configured separately per provider,
  not as one unified agent subscription pool. The UI may aggregate them, but the
  data model keeps Claude, Cursor, Codex, and future providers distinct.
- 2026-05-31: UI may show one total agent cost, but must expose a breakdown for
  official API cost, allocated personal subscription cost, and unallocated
  personal subscription cost.
- 2026-05-31: PRD written in
  `docs/superpowers/specs/2026-05-31-personal-agent-cost-connectors-design.md`.
- 2026-05-31: Stage advanced to `issues`; atomic TDD-ready issues listed here.
- 2026-05-31: Stage advanced to `implement`; Issue 1 green. Added shared
  official/personal provider types, Codex as a cost-event provider, personal
  subscription schema/migration, and official-provider type narrowing. Verified
  with server tests and root build.
- 2026-05-31: Issue 2 green. Added personal subscription create/list/update/
  disable/delete APIs with validation for provider, billing status, monthly
  amount, currency, and effective dates. Verified with server tests and root
  build.
- 2026-05-31: Issue 3 green. Added daily personal subscription cost calculation
  for active paid subscriptions, excluding free, unpaid, disabled, and inactive
  rows. Verified with server tests and root build.
- 2026-05-31: Issue 4 green. Added local connector detection for Claude,
  Cursor, and Codex through hardcoded `/usr/bin/which` checks plus an API
  endpoint. Verified with server tests and root build.
- 2026-05-31: Issue 5 green. Added local activity metadata sync with a dedicated
  activity table, idempotent imports, and prompt/response/transcript content
  rejection. Verified with server tests and root build.
- 2026-05-31: Issue 6 green. Added daily personal subscription allocation into
  agent cost events, splitting by local activity share and leaving unmatched
  activity unallocated. Verified with server tests and root build.
- 2026-05-31: Issue 7 green. Added cost-source breakdown fields for official
  API, allocated personal subscription, and unallocated personal subscription
  cost while preserving total/assigned/unassigned math. Verified with server
  tests and root build.
- 2026-05-31: Issue 8 green. Added Settings UI/API client support for personal
  subscriptions, connector detection, manual allocation sync, and cost-source
  breakdown labels. Verified with server tests and root build. Local dev smoke
  found port 3000 already occupied, so browser smoke was not completed.
