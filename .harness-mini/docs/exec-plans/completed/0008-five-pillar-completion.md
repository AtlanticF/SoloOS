---
plan: five-pillar-completion
seq: 0008
stage: done
owner: main
mode: full
eval: L2
---
# Five-Pillar Completion (v0.1.0) — implementation plan

## Intake

v0.1.0 target locked via brainstorm (see Decisions log). SoloOS already has a
working spine (Entry → Event → Project → Review across five pillars; Node/TS +
SQLite server, Vite + React web, `solo capture` CLI, GitHub webhook, agent-cost
ledger). The gap for v0.1.0 is that only three of five pillars are honestly fed.

Current state (verified in code):
- Pillar types exist for all five: `packages/shared/src/types/pillar.ts`.
- `solo capture --pillar <p>` already accepts `input|output|audience|financial|energy`
  (`apps/server/bin/solo.ts`).
- `entries.ts:65` routes non-INPUT pillars to event creation (impact_score 1), so
  **manual Audience capture already works**.
- Output is fed by the GitHub webhook (`webhooks/github.ts`); Financial by the
  agent-cost ledger (+ Stripe webhook). Input by manual capture/insights.
- **Radar is computed client-side** in `apps/web/src/pages/Cockpit.tsx`: sum
  `impact_score` per pillar across ALL events, normalize each pillar against the
  single largest pillar total → 0–100. ENERGY currently shows 0 (no source).
- Review is created with `snapshot: '[]'` (`reviews.ts:47`) — the stored snapshot
  is not the radar source today.

Five-step (delete/simplify applied): deferred the Vercel client deploy,
multi-platform Audience connectors, and Energy proxy signals out of v0.1.0. What
remains is the minimum to make all five axes honest plus a zero-rework connection
seam.

Riskiest assumption (front-loaded): *a newly-fed pillar (Energy) ingests and
renders on the radar end-to-end.* Issue 1 proves it.

## PRD

- Spec: `docs/superpowers/specs/2026-06-01-soloos-v0.1.0-target-design.md`
  (grilled via the brainstorm Q&A: target user, core story, pillar feeds,
  Audience source, topology).
- Goal: complete the five-pillar loop for user #1 (local-first) — define + feed
  **Energy** (self-rating) and **Audience** (GitHub-social deltas + manual),
  give the radar an honest flow-vs-level scoring, and make the client→API
  boundary config-driven so the hosted (Vercel) client drops in later with no
  rework.
- Out of scope (v0.1.x / later):
  - Actual Vercel deploy of the hosted client; pairing token + secure-context
    handling beyond the config seam.
  - Multi-platform Audience connectors (X/Twitter, newsletter).
  - Energy proxy signals (late-night commits, burn-as-heat).
  - Multi-user / auth / sharing.

## Issues

- [x] **Issue 1 — Energy reading ingestion (walking skeleton)**
  - Outcome: `solo energy <1–5>` records an `Entry` → `Event{ pillar: ENERGY,
    impact_score: rating }`; the rating (not a flat 1) is preserved. The ENERGY
    axis becomes non-zero on the existing Cockpit radar.
  - Failing test first: server test — recording energy 3 persists an ENERGY event
    with `impact_score = 3`; values outside 1–5 and non-integers are rejected.
  - Layer footprint: Runtime (CLI command + route) → reuses Repo/Service via the
    entries/events path. (Allow an `impact_score` override on the ENERGY entry.)
  - Done = test green; a recorded reading shows on the radar (manual check).

- [x] **Issue 2 — Energy required at the Review Gate**
  - Outcome: completing the weekly review requires an Energy rating for the
    period (slider in the gate + API validation); reflection + agent_cost_decision
    requirements unchanged.
  - Failing test first: reviews API test — complete-without-energy is rejected;
    complete-with-energy (1–5) succeeds; existing reflection/agent-cost rules
    still hold.
  - Layer footprint: Service (`routes/reviews.ts`) → UI (`pages/Review.tsx`).
  - Done = API tests green; Review UI collects the rating; gate still blocks the
    Cockpit. (Run impact analysis on the review-complete path first.)

- [x] **Issue 3 — Audience GitHub-social auto-feed**
  - Outcome: a user-triggered sync snapshots stars/watchers/forks (and account
    followers) for linked repos and emits `AUDIENCE` events for positive deltas
    since the last snapshot; no change → no event; re-running is idempotent.
  - Failing test first: service test — prior snapshot stars=10, new=13 → one
    AUDIENCE event impact 3; equal counts → no event; double-run → no duplicate.
  - Layer footprint: Types → Repo (social-snapshot table + migration) → Service →
    Runtime (manual-sync endpoint, mirroring the 0007 manual-sync pattern). Reuses
    `github-config-service` for token/repos.
  - Done = service + API tests green; manual capture to AUDIENCE still works.

- [x] **Issue 4 — Radar flow-vs-level scoring (server-side)**
  - Outcome: a server balance endpoint returns per-pillar period scores —
    **flow** pillars (Input/Output/Audience/Financial) normalized 0–100 vs that
    pillar's trailing rolling max (default 8 periods, tunable); **Energy** scored
    as the period mean rating scaled 1–5 → 0–100. Cockpit reads this endpoint
    instead of the client-side all-time cross-pillar calc.
  - Failing test first: service tests — flow normalization vs baseline (incl.
    first-period / empty-history edge), Financial negative net reads low, Energy
    level from ratings [2,4] → 50, no readings → defined empty behavior.
  - Layer footprint: Service (new scoring module) → Runtime (endpoint) → UI
    (Cockpit consumes endpoint; remove client-side calc).
  - Note: **this changes how the existing Input/Output/Financial axes read** —
    run impact analysis on `Cockpit.tsx` scoring before editing.
  - Done = scoring tests green; radar renders all five from the endpoint.

- [x] **Issue 5 — Connection seam (Mode-1-ready, not deployed)**
  - Outcome: server CORS origins come from config (default = today's localhost
    origins; extra via `SOLOOS_ALLOWED_ORIGINS`); client API base is
    `import.meta.env.VITE_API_BASE ?? '/api'`. Local `pnpm dev` behaves
    identically. Mode 1 wiring documented, not built.
  - Failing test first: server test — default allowlist preserves
    `http://localhost:5173`, `http://127.0.0.1:5173`, `http://[::1]:5173`; an env
    origin is added when set.
  - Layer footprint: Config → Runtime (`index.ts:33`) ; Config → UI
    (`lib/api.ts:12`).
  - Done = test green; no local regression; README/spec note the Mode 1 seam.

## Evaluation

- Tier: **L2**. Multiple correctness/trust-sensitive surfaces — the Review
  completion gate, an external GitHub API poller, radar scoring semantics the
  user makes decisions on, and a CORS trust boundary.
- **Verdict (2026-06-01): PASS — 7/7 criteria, 0 failures.** Independent L2
  evaluator produced its own evidence: `pnpm --filter server test` → 112/112
  green (test bodies read, not just names); `pnpm build` → shared+server+web
  green. Disclosed-and-accepted: FINANCIAL axis = positive revenue (not signed
  net — spend lives in separate tables); week-bounds DRY smell across
  `reviews.ts`/`reviews.test.ts`/`balance-service.ts` → deferred gardener pass.

## Now

- **Complete.** L2 evaluation PASS (7/7, 0 failures). Checkpoint:
  `.trace/checkpoints/five-pillar-completion-001.md`. Non-blocking follow-ups
  live in the checkpoint's "Next".

## Decisions log

- 2026-06-01: Brainstorm locked v0.1.0 — target user: the builder (dogfood,
  user #1, local-first); core story: capture → Review-gated five-pillar loop with
  ALL five pillars defined + fed; pillar feeds: Input=manual, Output=GitHub,
  Financial=agent-cost (done) / Energy=self-rating + Audience=GitHub-social+manual
  (build); topology: Mode 2 (local) ships, config seam makes Mode 1 (hosted
  Vercel client) zero-rework. Spec:
  `docs/superpowers/specs/2026-06-01-soloos-v0.1.0-target-design.md`.
- 2026-06-01: Stage intake→prd: spec serves as PRD; grilled via brainstorm Q&A.
- 2026-06-01: Stage prd→issues: 5 atomic, TDD-ready issues; vertical-first with
  Energy ingestion as the walking skeleton; eval tier L2.
- 2026-06-01: Stage issues→implement: starting Issue 1.
- 2026-06-01: Issue 1 green. `entries.ts` POST accepts an optional `impact_score`;
  an explicit `ENERGY` entry requires an integer rating 1–5 and persists it as the
  event `impact_score` (was hardcoded 1); added the `solo energy <1–5>` CLI
  command. Verified: full server suite 94 tests green (4 new energy route tests).
  ENERGY now lights up on the existing client radar.
- 2026-06-01: Issue 2 green. Completing a weekly review now requires an
  `energy_rating` (1–5): added to `CompleteReviewRequest`, validated in
  `routes/reviews.ts`, and recorded as an ENERGY event inside the review period
  (guarantees the axis is never empty). Added the 1–5 selector (Violet accent) to
  both `pages/Review.tsx` and the Cockpit-blocking `components/cockpit/ReviewGate.tsx`
  + `api.reviews.complete` signature + en/zh i18n. Impact analysis initially
  missed `ReviewGate.tsx` as a second `reviews.complete` caller — the workspace
  build caught it. Verified: server suite 97 tests green (3 new) + full build
  green. Note: the web package commits `tsc`-compiled `.js` next to each `.tsx`;
  `pnpm build` regenerates them, so they are staged alongside source (Vite
  resolves `.tsx` first at runtime, but the repo keeps `.js` in sync).
- 2026-06-01: Issue 3 green. Added the AUDIENCE auto-feed: `github_social_snapshots`
  table, `audience-service.recordSocialSnapshot` (per-repo delta of
  stars+watchers+forks → one AUDIENCE event with impact = positive delta;
  first snapshot = baseline/no event; unchanged/shrinking = no event; idempotent),
  a thin `fetchUserRepoSocials` GitHub boundary, and `POST /api/audience/sync`.
  Verified: server suite 103 tests green (5 service + 1 route) + full build green.
  GOTCHA: `drizzle-kit generate` produced a bogus migration recreating every
  table — this repo only commits meta snapshots through 0002, so the diff
  baseline is stale. The repo's real convention is hand-written migrations +
  journal entries with NO snapshots (see 0003–0010); followed it for
  `0011_github_social_snapshots.sql`. Scope trims (noted, not built): account
  followers as an Audience signal, and a Settings "Sync audience" button +
  auto-sync hook — deferred; the endpoint runs the slice end-to-end for now.
- 2026-06-01: Issue 4 green. Replaced the client-side radar math (all-time,
  cross-pillar) with server-side `balance-service.computePillarBalance` +
  `GET /api/balance`: flow pillars (Input/Output/Audience/Financial) normalize
  the current week's impact vs that pillar's trailing 8-week max; Energy scores
  as the period mean rating mapped 1–5 → 0–100. Cockpit now consumes the
  endpoint (radar + balance bars + energy pulse). Verified: server suite 108
  tests green (4 service + 1 route) + full build green. DEVIATION from spec:
  "Financial signed net (rev − spend)" does not apply — agent-cost spend lives
  in its own tables, not the `events` table, so the FINANCIAL radar axis = the
  positive revenue signal only; spend stays in the Review summary. Noted smell:
  the Monday week-start math now exists in `reviews.ts`, `reviews.test.ts`, and
  `balance-service.ts` — extract a shared `week` util in a later gardener pass.
- 2026-06-01: Issue 5 green. Connection seam: CORS origins now resolve via
  `config/cors.resolveAllowedOrigins` (defaults preserved; extra origins via
  `SOLOOS_ALLOWED_ORIGINS`), and the client API base is
  `import.meta.env.VITE_API_BASE ?? '/api'` (added `vite-env.d.ts` for typing).
  Local `pnpm dev` behavior is unchanged. README documents the Mode 1 vars.
  Verified: server suite 112 tests green (4 new) + full build green.
- 2026-06-01: Stage implement→evaluate. All 5 issues green; spawning the L2
  evaluator in a separate context to grade against the acceptance criteria
  (anti-self-praise firewall).
- 2026-06-01: Evaluate→checkpoint→done. L2 verdict PASS (7/7, 0 failures).
  Checkpoint `five-pillar-completion-001` written; plan moved to
  `docs/exec-plans/completed/`.
