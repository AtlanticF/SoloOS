---
plan: recon
seq: 0001
stage: done
owner: main
---
# Recon graft

This harness was grafted onto an existing project (the **SoloOS** product). Map
the ground before new work. Do NOT run the greenfield funnel — this project
already exists.

## Outcome (recon complete 2026-06-03)
The full schema below was filled into `ARCHITECTURE.md` → "Domains & layers" from
the live codebase, verified by running the commands (117 server tests green;
shared+server `tsc` clean):

- [x] Entry points — API `apps/server/src/index.ts`; CLI `apps/server/bin/solo.ts`; web `apps/web/src/main.tsx`
- [x] Test command — `pnpm test` (Vitest)
- [x] Build command — `pnpm build` (shared → server → web)
- [x] Lint / typecheck — no separate lint; `tsc` via `pnpm build`
- [x] Main domains — input·output·audience·agent-cost·balance·associations·classifiers·reviews·github/webhooks·config·db
- [x] Layer structure — Types → Config → Repo → Service → Runtime → UI
- [x] Where product behaviour lives — `server/src/<domain>/*-service.ts` + `routes/*` + `web/src/pages/*`
- [x] Where tests live — colocated `*.test.ts` in `server/src/**`
- [x] Risky dirs — `db/schema.ts` + hand-written migrations; provider secret handling
- [x] Generated/vendor — `node_modules`, `dist/`, compiled `.js` beside `.tsx` in web
- [x] First vertical slice — the spine (capture → event → Cockpit → Review Gate), already built

## Decisions
- 2026-06-03: Recon completed by the main agent (not the explorer): ARCHITECTURE.md
  "Domains & layers" filled from the live code; commands verified. Stage → done.
  Product user-story + core-philosophy synthesis lives in `docs/product-spine.md`.
