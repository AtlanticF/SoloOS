# SoloOS — project architecture (recon)

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
