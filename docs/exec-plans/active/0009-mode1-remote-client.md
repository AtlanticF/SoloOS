---
plan: mode1-remote-client
seq: 0009
stage: implement
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

- [ ] **Issue 3 — Connection Gate (web) + polling**
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

- [ ] **Issue 4 — Hosted build config**
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

## Now

- Implement Issue 3 (Connection Gate UI + polling) test-first.

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
