---
title: SoloOS Mode 1 — Hosted Client + Local Server (GitNexus-style)
date: 2026-06-01
status: approved (design); pending implementation plan
owner: matt
relates: extends the connection seam from
  docs/superpowers/specs/2026-06-01-soloos-v0.1.0-target-design.md (Section 4)
---

# SoloOS Mode 1 — Hosted Client + Local Server

## 0. Purpose

Implement the GitNexus-style "remote UI, local data" topology: a hosted web
client (e.g. `soloos.vercel.app`) that the user opens in any browser; the user
starts a local server with one command; the page **auto-detects** the local
server and renders the app. All data stays in the user's local SQLite. v0.1.0
already shipped the config seam (env-driven CORS + `VITE_API_BASE`); this builds
the actual experience on top of it.

## 1. Decisions (locked via brainstorm)

- **Serve distribution:** dogfood-now, publish-ready. Add a clean `pnpm serve`
  command that boots the existing server; the hosted client connects to
  localhost. No npm publish yet — structured so `npx soloos serve` is a trivial
  later step.
- **Port:** dedicated **5010** for `serve` (Mode 1), so the hosted page probes
  one known address with no false positives. Local Mode-2 dev keeps **3000**.
  Port is configurable via `PORT`.
- **Gate scope:** the Connection Gate is active only for the remote/hosted build
  (when `VITE_API_BASE` is an absolute URL). Local Mode-2 dev is untouched.
- **Security:** rely on the browser treating `localhost` as trustworthy +
  CORS + Private Network Access (PNA). Front-load proving it.

## 2. Architecture & flow

```
[ soloos.vercel.app ]  ──poll GET /health (~1.5s)──►  [ local server :5010 ]  ──►  ~/.soloos/soloos.db
   Connection Gate                                       started by `pnpm serve`        (local only)
   (detects soloos signature) ── then renders App ──►  /api/*
```

The hosted client **is** the existing `apps/web`, built with
`VITE_API_BASE=http://localhost:5010/api`. On load the Connection Gate polls the
local server; once it sees SoloOS's health signature it renders the app.

## 3. Components (four small units)

### 3.1 Server: configurable port + identity + PNA
- `serve()` reads `PORT ?? 3000` (currently hardcoded 3000 at `index.ts:84`).
- `/health` returns `{ ok: true, app: 'soloos', version }` — an **identity
  signature** so the page confirms it is really SoloOS (not some other server on
  the port).
- A tiny middleware answers the **Private Network Access** preflight: when a
  request carries `Access-Control-Request-Private-Network: true`, the response
  includes `Access-Control-Allow-Private-Network: true`.
- `resolveAllowedOrigins` (already env-driven) carries the hosted origin via
  `SOLOOS_ALLOWED_ORIGINS` in serve mode.

### 3.2 `serve` command
- Root `pnpm serve` boots the server with `PORT=5010` and the hosted origin
  allowed, and prints the URL to open. Built as a bin-style entry so publishing
  `npx soloos serve` later is trivial. (Inline env in the npm script; `cross-env`
  for Windows portability is a noted follow-up — primary dev is macOS.)

### 3.3 Connection Gate (web)
- A component wrapping `App` in `main.tsx`. **Active only when `VITE_API_BASE`
  is an absolute URL** (`startsWith('http')`); in local Mode-2 dev (`/api`) it is
  inert and renders `App` immediately.
- State machine: `probing → connected`. Polls `<base>/health` every ~1.5s; a
  response with `app === 'soloos'` ⇒ `connected` ⇒ render `App` (no refresh).
- While `probing`, render the start-server screen (modeled on the GitNexus init
  UI, in SoloOS's dark/zinc theme): the `pnpm serve` command (+ a note that
  `npx soloos serve` is coming), a "listening… auto-connects when detected"
  status, and a requirements footer (Node version · port 5010).

### 3.4 Hosted build + deploy config
- `vite build` with `VITE_API_BASE=http://localhost:5010/api` + a `vercel.json`
  (static SPA). The **Vercel deploy is the user's** (their account); not done
  here. A local stand-in: `vite preview` on a different port acts as the "hosted"
  origin for testing.

## 4. Security (the riskiest assumption — prove first)

An HTTPS page fetching `http://localhost:5010` needs: (a) `localhost` treated as
potentially-trustworthy (Chromium ✅), (b) CORS allowing the hosted origin,
(c) the PNA preflight answered. The **first implementation slice is a walking
skeleton** proving a cross-origin page can read `localhost:5010/health` +
signature. Caveat (documented, non-blocking): reliable in Chromium; Safari /
Firefox PNA support varies.

## 5. Scope boundary

**In scope:** configurable port, health signature, PNA middleware, serve-mode
origin allowance, the `pnpm serve` command, the Connection Gate UI + polling, the
hosted build config (`vercel.json` + build env).

**Out of scope:** the actual Vercel deploy; npm publish of `soloos`; guaranteed
Safari/Firefox PNA; any pairing token / auth (localhost trust only); exposing the
server beyond localhost.

## 6. Success criteria (Done =)

- [ ] `pnpm serve` boots the server on **5010** (configurable via `PORT`); local
      `pnpm dev` still serves on 3000 and is unchanged.
- [ ] `GET /health` returns `{ ok: true, app: 'soloos', version }`.
- [ ] An `OPTIONS` preflight carrying `Access-Control-Request-Private-Network:
      true` gets `Access-Control-Allow-Private-Network: true`; CORS allows the
      configured hosted origin.
- [ ] The Connection Gate is **inert** when `VITE_API_BASE` is relative (Mode 2)
      and renders `App` immediately; when `VITE_API_BASE` is absolute it polls and
      only renders `App` after a `soloos` health signature.
- [ ] Manual (Chromium): with `pnpm serve` running and the client served from a
      **different origin** (`vite preview`), the page auto-connects and loads real
      data — no refresh.
- [ ] `vercel.json` + build env exist so the static client is deployable as-is.
- [ ] Server Vitest suite green; no Mode-2 regression.

## 7. References

- v0.1.0 seam: `apps/server/src/config/cors.ts`, `apps/server/src/index.ts:84`
  (port), `apps/web/src/lib/api.ts` (`VITE_API_BASE`), `apps/web/src/main.tsx`.
- GitNexus init UI (reference for the gate): hosted client + `npx … serve` +
  auto-detect on a fixed port.
