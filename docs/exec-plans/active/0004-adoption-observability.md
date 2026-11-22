---
plan: adoption-observability
seq: 0004
stage: implement
owner: main
---
# Adoption & observability (the 10 directions)

Make the harness easier to **adopt, observe, and trust** without making it
heavier to install or harder to reason about. Resolved via a grill-me session
(2026-05-30). Delivered as **4 grouped PRs** in priority order:
*understandable → resumable → observable → (only then) automate.*

## Resolved decisions (truth table)
- **#1/#3 walkthrough** — `docs/walkthrough.md` narrates one full loop; authored
  illustrative bundle in `docs/examples/demo-auth/` (`0001-demo-auth.md` + 2–3
  checkpoints). NOT under `exec-plans/` (never mistaken for active work).
- **#2 codex/cursor** — `docs/codex-getting-started.md`, `docs/cursor-getting-started.md`;
  manifest stays neutral; explicit "no sub-agents → run the role as a fresh
  prompt/thread" fallback. Docs only, no adapters.
- **#8 tiered eval** — convention in `skills/evaluate/SKILL.md`: L0 self-check +
  evidence (tiny) · **L1 independent lightweight = DEFAULT** (haiku/fresh ctx) ·
  L2 opus (cross-slice/arch/security/data-loss/public-API/release). Not a runtime.
- **#10 quick/full** — `docs/templates/{quick,full}-plan.md` + README first-screen
  decision table. Surfaces the `stage-viewer` simple/complex routing.
- **#3 doctor** — `harness.sh doctor`; 3-severity soft exit (FAIL→exit 1). Checks:
  AGENTS.md, harness.lock, skill folder-shape, manifest lists skills, active
  exec-plan, .trace/runtime ignored, unresolved .new (WARN), version==lock (WARN),
  + #9 source↔mirror divergence (WARN). `check` reserved for stricter CI later.
- **#4 status** — `harness.sh status`: version · active plans+stages · latest
  checkpoint/plan · .new count · last ctx_pct+event (tail -n1) · resumable bool.
  grep/awk/tail only — NO JSONL parsing engine.
- **#5 ctx** — already configurable (`HARNESS_CTX_THRESHOLD`). Work = docs
  (`smart-dumb.md` 30/40/60 examples + when to adjust), `ctx.sh` help examples,
  `status` surfaces last ctx_pct.
- **#6 shell-compat** — CONTRIBUTING section (bash 3.2/macOS, linux bash,
  zsh-callable, no deps, GNU/BSD diffs) + brief README line.
- **#7 recon** — concrete output schema (entry points; test/build/lint cmd;
  domains; layers; risky + generated/vendor dirs; where behaviour + tests live;
  one recommended first slice) into the `0001-recon.md` seed (`init.sh`) +
  `agents/explorer.md`.
- **#9 double tree** — canonical `skills/`; committed **generated** `.claude/`
  mirror; `doctor` divergence WARN + documented `cp -R skills/. .claude/skills/`
  regen; README/CONTRIBUTING state it loudly.

## PR breakdown
- **PR A — first-run docs** (this branch): #2, #10, #6, #9-docs, #5-docs, #7.
- **PR B — walkthrough + demo-auth example**: #1/#3.
- **PR C — tiered evaluation convention**: #8.
- **PR D — health commands (TDD)**: #3 doctor, #4 status, #9 divergence check,
  #5 ctx_pct surfacing.

## Mini guardrails (apply to every PR)
- Docs/conventions/templates + thin POSIX shell only; no runtime/deps.
- `status`/`doctor` use grep/awk/tail — no JSON parser.
- Each PR: branch → green `tests/run.sh` → PR (per [[git-flow-preference]]).

## Now (resume here) — reconciled 2026-06-03 vs harness 0.6.0
This is **harness-framework** work (not SoloOS product). Most of it is now
delivered; only PR B remains:
- **PR A — DONE** (branch `first-run-docs`): #2 codex/cursor getting-started,
  #10 quick/full templates + README table, #6 shell-compat, #9-docs, #5-docs,
  #7 recon schema. Verified present in the install.
- **PR C — DELIVERED UPSTREAM by harness 0.6.0**: #8 tiered eval is now the
  shipped convention (`.claude/skills/evaluate/SKILL.md` carries L0/L1/L2).
- **PR D — DELIVERED UPSTREAM by harness 0.6.0**: #3 `doctor`, #4 `status`,
  #5 ctx_pct surfacing, #9 divergence — all present in `bin/harness.sh`
  (`cmd_doctor`/`cmd_status` verified running).
- **PR B — REMAINING (the only gap)**: `docs/walkthrough.md` + the illustrative
  `docs/examples/demo-auth/` bundle. Currently ABSENT.

## Next
- Decide with the user: **(a)** build PR B (walkthrough + demo-auth example) to
  close this plan, or **(b)** close it now as substantially-superseded and split
  PR B into its own tiny plan if still wanted. No product-spine dependency either
  way — this is orthogonal harness tooling.

## Decisions log
- 2026-05-30: grill-me converged all 10 + 4-PR delivery. Stage=implement.
- 2026-05-30: PR A built (docs only; also fixed stale skills/*.md links left by
  the folder migration). Forward-refs to unbuilt status/doctor/walkthrough avoided.
- 2026-06-03: Reconciled vs harness 0.6.0 (project updated 0.4.0→0.6.0). PR C
  (tiered eval) and PR D (doctor/status/ctx/divergence) are delivered upstream —
  verified in the install. Only PR B (walkthrough + demo-auth) remains. Plan is
  near-complete; awaiting user decision to build PR B or close.
