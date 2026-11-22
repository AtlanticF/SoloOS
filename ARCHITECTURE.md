# Architecture

Top-level map of how harness-mini is laid out and how work flows through it.

## Repository layout

```
AGENTS.md              # ~100-line map injected every run (table of contents)
ARCHITECTURE.md        # this file
VERSION                # canonical version (SemVer); bumped by `harness.sh release`
CHANGELOG.md           # Keep-a-Changelog; rolled on release
init.sh                # additive, idempotent installer (new vs existing)
bin/
  harness.sh           # front-door CLI: version·update·doctor·status·release
  _harness_lib.sh      # shared helpers: managed-set, checksums, lockfile
  ctx.sh               # context % estimate vs the 40% threshold
  trace.sh             # append runtime JSONL (best-effort, never blocks)
  ralph.sh             # ralph-loop driver (work → check → repeat)
skills/                # one folder per skill: <name>/SKILL.md (required;
                       #   metadata in frontmatter) + optional scripts/
                       #   references/ assets/ examples/ tests/.
                       #   Installed (recursively) to .claude/skills/<name>/
agents/                # sub-agents, flat <name>.md → installed to .claude/agents/
docs/
  principles.md        # golden principles + Five-Step core-mind
  smart-dumb.md        # the 40% occupancy contract
  exec-plans/
    active/            # in-flight plans + decision logs (committed)
    completed/         # archived plans (committed)
  references/          # *-llms.txt distillates of the source blogs
tests/run.sh           # zero-dep TDD suite for bin/* and init.sh
harness/
  manifest.md          # neutral pointer list for non-Claude CLIs
  harness.lock         # installed version + pristine checksums of managed files
.trace/
  checkpoints/         # COMMITTED — decisions, milestones, handoffs
  runtime/             # GITIGNORED — ephemeral per-run JSONL
```

## Versioning & update model

An install is a snapshot of the **managed set** — the files harness-mini owns
(`bin/*`, `.claude/skills/**` recursively, `.claude/agents/*`,
`docs/principles.md`, `docs/smart-dumb.md`, `docs/references/*`, `AGENTS.md`,
`ARCHITECTURE.md`). The set is defined once, in `emit_managed_pairs()`
(`bin/_harness_lib.sh`) — which recurses `skills/` so every file under a skill
folder is tracked — and is the
single boundary between "harness territory" and "user territory" (your
exec-plans, `.trace/`, and project code are never in it).

`init.sh` writes `harness/harness.lock` recording the version and the **pristine
upstream checksum** of each managed file. `harness.sh update` diffs three states
per file — `base` (lock baseline), `cur` (on disk), `new` (upstream) — to decide
ADD / UNCHANGED / UPDATE / CONFLICT, so a newer harness can be pulled in without
ever clobbering a file you edited. `harness.sh release` is the inverse end: it
stamps a new `VERSION`, rolls `CHANGELOG.md`, tags `v<x.y.z>`, and publishes a
GitHub release (gated on green tests + a clean tree).

## Lifecycle FSM

```
intake → prd → issues → implement ⇄ evaluate → checkpoint → done
                           ↑___________|   (loop until criteria pass)
       garden ──── runs orthogonally, on triggers ────
```

- State lives in each `docs/exec-plans/active/<plan>.md` frontmatter (`stage:`).
- **Transition authority (mode C):** agents work freely *within* a stage, but
  only the **main agent** (via `stage-viewer`) advances the FSM. No sub-agent
  may mark its own output "done" — the evaluator gate plus main-agent control
  is the anti-self-praise firewall extended across the whole lifecycle.
- **Garden triggers (orthogonal):** gardening fires on concrete signals, not
  "periodically" — **≥5 checkpoints** since the last sweep, a plan completing, a
  pending release, or the **smell backlog** (`.trace/garden-backlog.md`) crossing
  its threshold (any `high` / ≥3 open). `harness.sh status` prints `garden:
  DUE|ok`; the main agent dispatches the gardener. See the `garden` skill.

## Coding contract: horizontal + vertical (`slice-coding`)

- **Vertical** — build one feature as a thin walking skeleton end-to-end
  (it runs, it's tested) *before* starting the next feature. Depth-first,
  value-first.
- **Horizontal** — respect a fixed layer stack with **forward-only**
  dependencies. The reference stack (adapt per project):

  ```
  Types → Config → Repo → Service → Runtime → UI
  ```

  Cross-cutting concerns (auth, telemetry, feature flags, connectors) enter
  through a single explicit **Providers** seam. Nothing depends "backward."

- The rule: *a vertical slice proves the path; then expand horizontally across
  features within the same layered contract.* Enforce mechanically where the
  project allows (lint / structure tests); the generator reads this before
  writing code.
- **Parallel horizontal expansion:** once the vertical skeleton passes evaluate,
  the main agent may fan the remaining independent issues out to parallel
  generators — gated on **disjoint file footprints** so no two collide — then run
  a single integration evaluate (`parallel-slices`). Vertical-first, then widen in
  parallel.

## New vs existing project (set by `init.sh`)

- **new** → generative bootstrap: seed `0001-intake.md`, run the founder funnel
  (founder-check → five-step → to-prd → to-issues).
- **existing** → recon graft: seed `0001-recon.md`, the explorer maps the
  codebase into this file's "Domains & layers" section below; skip the founder
  funnel; install additively without overwriting anything.

## Domains & layers

> Recon of the **SoloOS product** (the application this harness was grafted onto).
> Filled 2026-06-03 from the live codebase (117 server tests green; shared+server
> `tsc` clean). SoloOS is a pnpm monorepo; harness-mini lives alongside it in the
> same repo (`bin/`, `skills/`, `docs/exec-plans/` are harness territory, not the
> product).

**Entry points**
- API server — `apps/server/src/index.ts` (HTTP API; `pnpm dev` → :3000, `pnpm serve` → :5010; CORS allowlist at `index.ts:33`, env `SOLOOS_ALLOWED_ORIGINS`).
- CLI — `apps/server/bin/solo.ts` (`solo capture [content] --pillar …`, `solo energy <1-5>`).
- Web — `apps/web/src/main.tsx` → `App.tsx`; Vite dev :5173 proxies `/api` + `/webhooks` → :3000. Client API base at `apps/web/src/lib/api.ts:12` (`VITE_API_BASE ?? '/api'`).
- Data — SQLite at `~/.soloos/soloos.db`, created + migrated on boot.

**Commands**
- Test: `pnpm test` (= `pnpm --filter server test` = Vitest). Build: `pnpm build` (shared → server → web). Dev: `pnpm dev` (root only). Seed: `pnpm --filter server db:seed`.
- Lint / typecheck: **no separate lint script**; typecheck is `tsc` via `pnpm build` (`apps/server` + `packages/shared` use `tsc`, `apps/web` builds via Vite).

**Main domains** (`apps/server/src/`): `input` · `output` · `audience` · `agent-cost` (Financial) · `balance` (five-axis radar) · `associations` (entry↔event↔project) · `classifiers` (auto-pillar rules) · `agent` · `github` + `webhooks` (commit/social ingest) · `reviews` (the Review Gate) · `config` (cors/port) · `db`.

**Layer structure in use** (matches the `slice-coding` reference stack):
```
Types (packages/shared/src/types/*) → Config (server/src/config)
  → Repo (server/src/db: schema.ts, index.ts, hand-written migrations)
  → Service (server/src/<domain>/<domain>-service.ts)
  → Runtime (server/src/routes/*.ts + index.ts; CLI bin/solo.ts)
  → UI (apps/web/src/pages: Cockpit · Explorer · Output · Review · Settings)
```

**Where product behaviour lives** — domain logic in `apps/server/src/<domain>/*-service.ts`; HTTP surface in `apps/server/src/routes/*.ts`; shared contracts in `packages/shared/src/types/*`; the five product screens in `apps/web/src/pages/*`.

**Where tests live** — colocated `*.test.ts` beside the source in `apps/server/src/**` (Vitest). No web test suite.

**Risky dirs / files** — `apps/server/src/db/schema.ts` + migrations: **hand-write migration SQL + journal entry**, `drizzle-kit generate` is destructive here (see [[soloos-drizzle-migrations-handwritten]]). Secret handling in `agent-cost` provider configs (masked, never sent to frontend).

**Generated / vendor (do not edit)** — `node_modules/`, `dist/` (`packages/shared/dist`, `apps/server/dist`, `apps/web/dist`), and the **compiled `.js` committed next to each `.tsx`/`.ts` in `apps/web/src`** (a build artifact convention; edit the `.tsx`/`.ts`).

**First vertical slice** — already built and proven: the spine **`solo capture` → classified Event (project + pillar) → Cockpit radar → weekly Review Gate**. New work attaches to this loop (see `docs/product-spine.md`).
