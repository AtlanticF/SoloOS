---
plan: financial-axis-agent-cost
seq: 0010
stage: intake
owner: main
mode: full
eval: L2
---
# Financial radar axis ← agent-cost ledger — full mode

> Opened from the 2026-06-04 end-to-end dogfood. The loop runs and the Review
> Gate is solid, but the dogfood found a real breakpoint: **the agent-cost ledger
> does not feed the Cockpit's Financial axis.** This is the highest-value next
> slice — it connects the entire 0005/0006/0007 investment to the radar.

## Intake (dogfood evidence)
- Drove an isolated server (throwaway `$HOME`, :3010). Recorded a $12.50 manual
  agent-cost event → `GET /api/reviews/current` showed
  `agent_cost_summary.total_amount: "12.50"` (correct), **but** `GET /api/balance`
  showed `FINANCIAL { event_count: 0, score: 0 }`. The axis only moved to 100
  after a separate **FINANCIAL-pillar capture** (`POST /api/entries pillar=FINANCIAL`).
- Conclusion: the radar's FINANCIAL axis is computed from `pillar='FINANCIAL'`
  events only; the agent-cost ledger rows are a separate table that reaches the
  review summary but **not** `balance-service`.
- **Five-step / delete:** do NOT build a new finance subsystem. The ledger,
  netting, and per-period summary already exist (`summarizeAgentCostsForPeriod`).
  The only missing wire is: balance-service's FINANCIAL axis must subtract
  period agent-cost from period FINANCIAL-pillar revenue → **signed net**.
- Riskiest assumption: period boundaries + currency align between the ledger
  (`usage_start/usage_end`) and the review/balance period. Verify overlap math.

## Problem
SoloOS's design spine (v0.1.0 §3) defines **Financial = signed net (revenue −
spend)**, with spend sourced from the agent-cost ledger. Today the Cockpit's
Financial axis ignores agent spend entirely, so a week of AI spend with no manual
revenue capture reads as a flat/empty Financial axis — the opposite of the
"is the stress from cash?" use case. The biggest active investment is invisible
on the radar.

## PRD (run `to-prd`)
- Goal: the Cockpit FINANCIAL axis reflects **signed net throughput** for the
  period = (FINANCIAL-pillar revenue impact) − (agent-cost ledger spend for the
  same period), normalized per the existing flow rule (§3.1). A spend-heavy week
  reads low; a revenue-heavy week reads high.
- Reference: `docs/superpowers/specs/2026-06-01-soloos-v0.1.0-target-design.md` §3,
  §3.1; `docs/product-spine.md` §3.
- Out of scope (five-step delete): multi-currency conversion (assume the ledger's
  configured currency); new finance UI; changing the Review agent-cost decision
  (already works); per-project radar (radar is whole-operator).

## Acceptance criteria
- [ ] `GET /api/balance` FINANCIAL `score` reflects net = revenue − agent-cost for
      the period. Machine check: balance-service test — spend-only period reads
      below a revenue+spend period; revenue-only unchanged from today.
- [ ] A period with only agent-cost spend and no revenue produces a **non-empty,
      below-baseline** FINANCIAL axis (not a placeholder 0). Machine check: service test.
- [ ] No regression: the four other axes and the existing agent-cost review
      summary are unchanged. Machine check: existing 117 server tests still green.
- [ ] Dogfood repro: re-run the §Intake scenario → FINANCIAL axis is non-zero
      after the $12.50 event. Human/observed check.

## Issues (run `to-issues`)
1. balance-service: include period agent-cost spend in the FINANCIAL axis as
   signed net; define the impact unit reconciling dollars (ledger) with
   FINANCIAL-pillar `impact_score` (decide: treat revenue captures as signed
   amounts, or fold the ledger as the spend term only). One vertical slice.
2. Normalization: ensure the §3.1 flow normalization handles negative net
   (spend > revenue reads low, not clamped wrong).
3. Verify period-overlap between ledger `usage_*` and balance period.

## Vertical slices (build order)
1. Failing balance-service test (spend lowers FINANCIAL) → make it pass (`tdd`).
2. Expand to the route + dogfood repro.

## Evaluation
- Tier: **L2** — financial semantics, signed-net correctness, cross-slice
  (ledger ↔ balance), and it changes a number the user steers decisions on.

## Now (resume here)
- The PRD is essentially pre-written by v0.1.0 §3. Advance intake→prd→issues
  (`to-prd`/`to-issues`) or, given the design is locked, decompose Issue 1 and
  start TDD on `balance-service`.

## Next
- After balance-service is net-aware, re-run the dogfood Financial scenario as the
  observed acceptance check.

## Decisions log
- 2026-06-04: Opened from the end-to-end dogfood finding (agent-cost ledger not
  wired to the Financial radar axis). Evidence in this Intake; spine updated in
  `docs/product-spine.md` §3/§5.
