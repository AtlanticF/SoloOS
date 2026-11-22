# Checkpoint — recon close + board reconciliation + product-spine

date: 2026-06-03
agent: main
plan: recon (0001) → done; cross-cutting board reconcile
trigger: user asked to (1) re-align harness docs to the current code, then
         (2) re-sort the user story + product core philosophy.

## What was done

1. **harness-mini updated 0.4.0 → 0.6.0** (earlier in session). AGENTS.md merged
   (kept project-rules block + adopted new map). doctor healthy.

2. **Recon (0001) actually completed.** ARCHITECTURE.md "Domains & layers" was an
   empty template (`_(empty until a project is mapped)_`) — recon had never been
   done. Filled it from the **live SoloOS code**, verified by running commands:
   - 117/117 server tests green (`pnpm test`); shared+server `tsc` clean.
   - Entry points (API `apps/server/src/index.ts`, CLI `apps/server/bin/solo.ts`,
     web `apps/web/src/main.tsx`); layer stack Types→Config→Repo→Service→Runtime→UI;
     5 web pages = Cockpit/Explorer/Output/Review/Settings.
   - 0001-recon.md → stage `done`, moved to `completed/`, traced.

3. **Board reconciled to reality (active plans):**
   - `0004-adoption-observability` — harness-framework work; PR C/D delivered
     UPSTREAM by 0.6.0 (verified: evaluate tiers, cmd_doctor/cmd_status present).
     Only PR B (walkthrough + demo-auth, currently ABSENT) remains. Not product.
   - `0005`+`0006`+`0007` (agent-cost) — recognized as **ONE Financial-axis story**
     split into three. All issues `[x]`, code-complete, in the 117-green suite.
     They are **lifecycle-open, not code-incomplete**: never walked
     evaluate→checkpoint→done. 0006's "Codex limit until 2026-05-31" blocker is
     EXPIRED. 0007 still lacks one browser smoke (Settings/personal-connector
     journey; port 3000 was occupied).

4. **Wrote `docs/product-spine.md`** — the single source of truth for the user
   story line + closed loop + core philosophy, anchored to verified build state.
   Linked from README "Further reading".

## Current state of the loop (verified)

The core spine (capture → classified Event[project+pillar] → Cockpit 5-axis radar
→ mandatory weekly Review Gate) is BUILT across all five pillars (Energy + Audience
were the gaps; both shipped in 0008). Financial-axis agent-cost accounting is built
but not lifecycle-closed.

## Next (resume here)

1. **Close the Financial story** — run `evaluate` on 0005/0006/0007 (block expired;
   L1 adequate for dogfood-internal, or L2 as declared) → complete 0007's browser
   smoke → checkpoint → done → move to `completed/`. No new building; resist
   provider expansion before closing.
2. **End-to-end dogfood verification** (= v0.1.0 §6): one real run capture →
   `solo energy 3` → GitHub delta → agent-cost → Cockpit (5 honest axes) → Review
   Gate (requires Energy rating + per-project decision). Any break = the next slice.
3. **Decide 0004** — build PR B (walkthrough+demo) or close as superseded.

## Notes / uncommitted

- Working tree has the 0.6.0 harness-update changes + these doc edits, all
  UNCOMMITTED. User has not asked to commit. Nothing was committed this session.
- Memory: [[soloos-drizzle-migrations-handwritten]] (hand-write migrations),
  [[harness-update-self-overwrite-error]] (update's tail error is harmless).
