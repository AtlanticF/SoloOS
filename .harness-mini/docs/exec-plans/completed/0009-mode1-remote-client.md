---
plan: mode1-remote-client
seq: 0009
stage: done
owner: main
mode: full
eval: L2
---
# Mode 1 — Hosted Client + Local Server (GitNexus-style)

## Intake

v0.1.0 shipped the config seam (env CORS via `config/cors.resolveAllowedOrigins`,
client base via `VITE_API_BASE`). This builds the actual GitNexus-style
experience: a hosted client that auto-detects a one-command local server.

Current state (verified):
- Server starts via `serve({ fetch: app.fetch, port: 3000 })` at
  `apps/server/src/index.ts:84` (port hardcoded).
- `/health` returns `{ ok: true }` (`index.ts:36`) — no identity signature.
- Web bootstraps in `apps/web/src/main.tsx` (renders `App`); client base is
  `import.meta.env.VITE_API_BASE ?? '/api'` (`lib/api.ts`).
- CORS allowlist is env-driven (`config/cors.ts`); no Private Network Access
  (PNA) handling yet.

Decisions (brainstorm): serve = dogfood-now/publish-ready (`pnpm serve`, no npm
publish); dedicated port **5010** for Mode 1 (Mode-2 dev keeps 3000); the gate is
active only for the remote/hosted build; security via localhost-trust + CORS + PNA.

Riskiest assumption (front-loaded): an HTTPS/cross-origin page can fetch
`http://localhost:5010/health` once the server emits the right CORS + PNA headers.
Issue 1 makes the server emit + test those; the browser proof is the end-to-end
smoke.

## PRD

- Spec: `docs/superpowers/specs/2026-06-01-soloos-mode1-remote-client-design.md`
  (grilled via the brainstorm Q&A: serve distribution, port, gate scope, security).
- Goal: a hosted client that auto-detects and connects to a one-command local
  server (`pnpm serve` on :5010), data stays in local SQLite.
- Out of scope: actual Vercel deploy; npm publish of `soloos`; guaranteed
  Safari/Firefox PNA; any pairing/auth (localhost trust only); exposing the
  server beyond localhost.

## Issues

- [x] **Issue 1 — Server: port + health signature + PNA (walking skeleton)**
  - Outcome: server port is configurable (`PORT`, default 3000); `/health`
    returns `{ ok: true, app: 'soloos', version }`; an `OPTIONS` preflight with
    `Access-Control-Request-Private-Network: true` responds with
    `Access-Control-Allow-Private-Network: true`; CORS allows an origin given via
    `SOLOOS_ALLOWED_ORIGINS`.
  - Failing test first: server tests — `/health` returns the signature; an OPTIONS
    request carrying the PNA request header gets the allow header; a `resolvePort`
    helper returns `PORT` when set else 3000.
  - Layer footprint: Config (`resolvePort`, cors) → Runtime (`index.ts`).
  - Done = tests green; manual `curl` shows the signature + the PNA allow header.

- [x] **Issue 2 — `pnpm serve` command (Mode-1 boot)**
  - Outcome: `pnpm serve` boots the server on **5010** with the hosted origin
    allowed and prints the URL to open. Structured so `npx soloos serve` is a
    later publish step.
  - Failing test first: `resolvePort({ PORT: '5010' })` → 5010 (covered by Issue
    1's helper); script presence + boot is a smoke (scripts aren't unit-testable).
  - Layer footprint: Config/Runtime (root `package.json` script + serve entry).
  - Done = `pnpm serve` boots on 5010 (smoke) and prints the open URL; `pnpm dev`
    still serves on 3000.

- [x] **Issue 3 — Connection Gate (web) + polling**
  - Outcome: a `ConnectionGate` wraps `App`; **inert when `VITE_API_BASE` is
    relative** (renders `App` immediately); when absolute, it polls `<base>/health`
    (~1.5s) and renders `App` only after an `app === 'soloos'` signature, showing
    the start-server screen (SoloOS dark theme) while probing.
  - Failing test first: unit-test the pure decision logic — `isRemoteBase(base)`
    (absolute ⇒ true) and a `parseHealth(json)` / `isSoloosUp(json)` predicate.
    (Check whether `apps/web` has a test runner; if not, keep the logic in pure,
    server-vitest-testable helpers or add a minimal web vitest. The React polling
    component is verified by the end-to-end smoke.)
  - Layer footprint: Runtime/UI (`main.tsx` + `components/connect/ConnectionGate.tsx`
    + a pure `lib/connection.ts`).
  - Done = decision-logic tests green; manual: hosted build auto-connects.

- [x] **Issue 4 — Hosted build config**
  - Outcome: `vercel.json` (static SPA) + a documented build env so
    `VITE_API_BASE=http://localhost:5010/api pnpm --filter web build` yields a
    deployable client; README/spec note the deploy steps (user deploys).
  - Failing check first: build with the env set succeeds and the bundle targets
    `localhost:5010` (grep dist); `vercel.json` exists with SPA rewrites.
  - Layer footprint: Config (build) → deploy artifact.
  - Done = build green with the env; `vercel.json` present; deploy steps documented.

## Evaluation

- Tier: **L2**. Crosses a browser trust boundary (cross-origin localhost access,
  PNA preflight, CORS) and adds a new connection surface.
- **Verdict (2026-06-01): PASS — 0 failures.** Independent L2 evaluator produced
  its own evidence: server suite 117 + web suite 7 green; full build green; baked
  base confirmed; a live server smoke (with a disallowed-origin negative control)
  showed the signature + ACAO + PNA-allow only for the configured origin.
  Criterion 5 (live Chromium auto-connect) is **USER-VERIFIED** — browser-only,
  deferred by design. Non-blocking follow-ups: tighten the PNA header to fire only
  with an allowed CORS origin; move `healthUrl` into the tested `connection.ts`;
  repo-wide `.js` mirror cleanup.

## Now

- **Complete.** L2 PASS (0 fails) + the user's Chromium auto-connect smoke
  confirmed (criterion 5). Checkpoint: `.trace/checkpoints/mode1-remote-client-001.md`.
  Non-blocking follow-ups live in the checkpoint's "Next".

## Decisions log

- 2026-06-01: Brainstorm locked Mode 1 — serve = dogfood-now/publish-ready
  (`pnpm serve`), dedicated port 5010 (Mode-2 keeps 3000), gate active only for
  the remote build, security via localhost-trust + CORS + PNA. Spec:
  `docs/superpowers/specs/2026-06-01-soloos-mode1-remote-client-design.md`.
- 2026-06-01: Stages intake→prd→issues→implement; 4 atomic issues, vertical-first
  with the server reachability skeleton (PNA/CORS/signature) front-loaded; L2.
- 2026-06-01: Issue 1 green. `config/port.resolvePort` (PORT→int, default 3000);
  `/health` now returns `{ok:true, app:'soloos', version}`; a PNA middleware sets
  `Access-Control-Allow-Private-Network: true` on the preflight; `serve()` uses
  the resolved port. Verified: 5 new tests + full suite 117 green, AND a live
  smoke — `PORT=5010 … tsx src/index.ts` then `curl` showed the signature and a
  cross-origin OPTIONS preflight returning both ACAO + the PNA allow header.
- 2026-06-01: Issue 2 green. Added root `pnpm serve` =
  `pnpm --filter shared build && PORT=5010 pnpm --filter server exec tsx src/index.ts`
  (wraps the exact command the Issue 1 smoke proved boots on 5010). Root package
  is named `soloos`, so a future `bin` makes `npx soloos serve` a trivial publish
  step. Mode-2 `pnpm dev` (3000) unchanged.
- 2026-06-01: Issue 3 green. Added `lib/connection.ts` (`isRemoteBase`,
  `isSoloosHealth`, `probeServer`) + a `ConnectionGate` wrapping `App` in
  `main.tsx`: inert for a relative base (Mode 2 renders immediately), polls
  `<origin>/health` every 1.5s for a remote base and renders only on a `soloos`
  signature, showing the start-server screen (SoloOS dark theme) + en/zh i18n.
  Closed the web's zero-test gap with a minimal vitest (node env). Verified: 7
  web tests + full build green. React polling/UI ⇒ browser smoke at evaluate.
- 2026-06-01: Issue 4 green. `apps/web/vercel.json` (SPA rewrites); README "Remote
  client (Mode 1)" documents `pnpm serve` + the build/deploy + a local
  hosted-style test (vite preview on :4173). Verified:
  `VITE_API_BASE=http://localhost:5010/api pnpm --filter web build` bakes
  `localhost:5010/api` into the bundle.
- 2026-06-01: Stage implement→evaluate. All 4 issues green; spawning the L2
  evaluator (anti-self-praise). Live browser auto-connect is a user-side check
  (no browser available to the evaluator).
- 2026-06-01: L2 verdict PASS (0 fails); criterion 5 USER-VERIFIED (browser).
  Checkpoint `mode1-remote-client-001` written. Holding at evaluate/checkpoint
  pending the user's Chromium auto-connect smoke before marking done.
- 2026-06-01: User confirmed the Chromium auto-connect smoke — criterion 5 PASS,
  all 7 criteria pass. Evaluate→checkpoint→done; plan moved to
  `docs/exec-plans/completed/`.
