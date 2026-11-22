---
plan: input-axis-insight-promotion
seq: 0011
stage: intake
owner: main
mode: full
eval: L1
---
# Input radar axis ← insight promotion reachability — full mode

> Opened from the 2026-06-04 end-to-end dogfood. A plain `solo capture --pillar
> input` does **not** move the Input axis; the capture lands in the insight INBOX
> and never becomes a counted INPUT event without an enrichment/promotion step.
> Ambiguous (bug vs. missing UI action vs. agent-dependent), so: full mode,
> investigation-first.

## Intake (dogfood evidence)
- `POST /api/entries {pillar:'INPUT', content:'read a paper on cybernetics…'}`
  returned `status: processed`, **but** `GET /api/balance` kept `INPUT
  { event_count: 0, score: 0 }`, and `GET /api/events` listed no INPUT event.
- `GET /api/insights` showed the capture as `{ type:'SEED', status:'INBOX',
  event_id: null, metrics.certainty: 0.333 }`. The INPUT path
  (`input/insight-service.ts: processInputCapture`) only ran the **heuristic**
  parse (extracted `fact`; `synthesis`/`vector` empty → INBOX); the agent step
  (`agentParseInsight`) was skipped because no agent config existed in the
  isolated env. An insight only creates an INPUT event once promoted to ACTIVE
  (`event_id` set).
- This is the **insight-inbox model by design**, not a crash — but it means a
  fresh user's Input axis reads 0 after capturing, which fails the v0.1.0 §6
  "all five axes with real (non-placeholder) data" bar in the common case.

## Problem
The Input pillar is the one axis whose capture does not immediately register on
the radar. Either (a) the INBOX→ACTIVE→event promotion path isn't reachable from
the UI, or (b) it requires an agent config the user hasn't set, or (c) the
intended UX is "Input axis = promoted insights only" and that needs to be made
legible. We don't yet know which — investigate before building.

## PRD (run `to-prd`)
- Goal: after a normal user capture flow, the Input axis reads non-placeholder
  data **without** requiring the user to understand the insight internals —
  either by making promotion a reachable one-action step in the UI, or by
  defining/counting INBOX insights toward the axis, whichever matches the design.
- Out of scope (five-step delete): redesigning the whole insight model; requiring
  an LLM/agent for the basic loop to register Input.

## Acceptance criteria
- [ ] Investigation note: is INBOX→ACTIVE promotion implemented + reachable in the
      web UI (Explorer/Cockpit) without an agent? Documented yes/no with the path.
- [ ] After the standard capture→(promote) flow, `GET /api/balance` INPUT axis is
      non-zero. Machine check: service/API test for the chosen mechanism.
- [ ] No regression to OUTPUT/AUDIENCE/FINANCIAL/ENERGY axes. Machine check:
      existing tests green.

## Issues (run `to-issues`)
1. **Investigate** (first): trace promotion — does a route/UI action move an
   insight INBOX→ACTIVE and create the INPUT event? Capture the reachable path or
   the gap. This issue may resolve the whole plan or redefine issues 2–3.
2. Based on the finding: make promotion reachable (UI action) **or** count INBOX
   insights toward the Input axis with a defined rule.
3. Test the chosen mechanism end-to-end against the dogfood scenario.

## Vertical slices (build order)
1. Investigation (issue 1) — no code until the path is known.
2. Smallest change that makes the Input axis honest; TDD the axis behaviour.

## Evaluation
- Tier: **L1** — contained to the Input/insight path + balance read; no
  financial/security/data-loss surface. Bump to L2 only if it touches the radar
  scoring shared with other axes.

## Now (resume here)
- Start Issue 1 (investigate the promotion path). Read
  `apps/server/src/input/insight-service.ts` + the insights route + Explorer UI;
  determine if promotion is reachable without an agent.

## Next
- Decide mechanism (promote-action vs. count-inbox) and TDD it.

## Decisions log
- 2026-06-04: Opened from the end-to-end dogfood finding (Input capture stays in
  INBOX, doesn't feed the Input axis). Evidence in this Intake; spine updated in
  `docs/product-spine.md` §3/§5.
