---
plan: mode1-remote-client
seq: 001
stage: done
ctx_pct_at_checkpoint: 70
prev: none
---
## Done
- Plan 0009 (Mode 1 — hosted client + local server) implemented via TDD;
  **L2 evaluation PASS (0 failures)** from an independent context.
- Server suite **117** green, web suite **7** green (new web vitest), full build
  green. Live server smoke confirmed `/health` signature + cross-origin PNA/CORS
  headers; hosted build bakes `localhost:5010/api` into the bundle.
- Commits: `711b62ee` (spec), `ecc15be5` (0008 done-state fix), `8600e97a`
  (server port/health/PNA + `pnpm serve`), `b9c034db` (connection gate + hosted
  build config).
- Capabilities: `pnpm serve` boots the local server on **:5010**; the hosted web
  client (built with `VITE_API_BASE`) shows a Connection Gate that polls
  `<origin>/health`, detects the `soloos` signature, and renders the app — data
  stays in local SQLite. Mode-2 `pnpm dev` (:3000) unchanged.

## Now
- **Complete.** L2 PASS + the user's Chromium auto-connect smoke confirmed
  (criterion 5). Plan moved to `docs/exec-plans/completed/`.

## Next (resume here)
- Optional follow-ups (non-blocking): tighten the PNA header to fire only with an
  allowed CORS origin; move `healthUrl` into `lib/connection.ts` + test; the
  actual Vercel deploy + npm publish (`npx soloos serve`); repo-wide `.js` mirror
  cleanup.

## Decisions
- Rationale in `docs/exec-plans/active/0009-mode1-remote-client.md` (Decisions log)
  + spec `docs/superpowers/specs/2026-06-01-soloos-mode1-remote-client-design.md`.
- Port 5010 for serve (Mode-2 keeps 3000); gate active only for an absolute
  `VITE_API_BASE`; security = localhost-trust + CORS + PNA (Chromium).

## Open questions / blockers
- none blocking; criterion 5 awaits a user browser smoke.
