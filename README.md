# SoloOS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

SoloOS is a data-driven “one-person company” operating system for developers: capture work as **entries**, turn them into **events** along five business pillars, group them by **project**, and use **review gates** so reflection stays mandatory.

---

## Quick start

From the **repository root** (the folder that contains `pnpm-workspace.yaml` and the root `package.json`), install dependencies and start the API plus web UI:

```bash
git clone https://github.com/AtlanticF/SoloOS.git
cd SoloOS
corepack enable
pnpm install
pnpm dev
```

Do **not** run `pnpm dev` only inside `apps/web` — that script starts **Vite alone** and there will be no API on port 3000 (proxied `/api` calls will fail).

After `pnpm dev` from the root, your terminal should show **two** labeled streams, `api` and `web`. On first boot the API creates **`~/.soloos/soloos.db`** (SQLite), applies migrations, and logs **`SoloOS server running at http://localhost:3000`**. If the API process exits with an error, the dev command stops the web process as well so you are not left with a half-working stack.

Then open **http://localhost:5173** in your browser. The Vite dev server proxies `/api` and `/webhooks` to the backend on **http://localhost:3000**.

Optional sample data:

```bash
pnpm --filter server db:seed
```

Interactive API reference: **http://localhost:3000/docs** (Swagger UI).

---

## Run from source

### Requirements

- **Node.js** 20 or newer (LTS recommended)
- **pnpm** 9 or newer ([install](https://pnpm.io/installation); `corepack enable` then `corepack prepare pnpm@latest --activate` works on many setups). **pnpm 11** is supported.

`better-sqlite3` is a native dependency; releases in this repo target **better-sqlite3 12.x**, which ships prebuilt binaries for current Node versions when available, and may compile from source otherwise.

### Troubleshooting `pnpm install` (macOS)

- **`ERR_PNPM_IGNORED_BUILDS` / install script blocked** — pnpm 11 requires an explicit allow-list for dependency lifecycle scripts. This repo declares `allowBuilds` in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml). If your checkout is missing it or pnpm adds new packages, run **`pnpm approve-builds`**, set the suggested entries to `true`, then run **`pnpm install`** again.
- **`better-sqlite3` compile errors on Node 24** (for example `C++20 or later required`) — prefer staying on the locked **`better-sqlite3@12.x`** so a prebuilt binary is used; or switch to **Node 22 LTS** and reinstall. Ensure **Xcode Command Line Tools** are installed (`xcode-select --install`).
- **`prebuild-install` timeout** — retry **`pnpm install`**; the install will fall back to a local compile when no prebuild is downloaded.

### Clone and install

```bash
git clone https://github.com/AtlanticF/SoloOS.git
cd SoloOS
corepack enable
pnpm install
```

### Development

| Command | What it runs |
|--------|----------------|
| `pnpm dev` | **From repo root only:** API (`apps/server`, **3000**) + web (`apps/web`, **5173**) in parallel (`concurrently`, prefixes `api` / `web`; if API fails to start, the web dev server is stopped too) |
| `pnpm --filter server dev` | API only |
| `pnpm --filter web dev` | Web only (use when you already have the API running elsewhere; Vite still expects **3000** for `/api` proxy) |

### API errors (e.g. every route returns 500)

- Open the UI at **`http://localhost:5173`** or **`http://127.0.0.1:5173`** — both are allowed by the API CORS settings in development.
- Watch the **server terminal** for **`[SoloOS API]`** logs; unhandled errors are printed there and returned as JSON `{ "error": "…" }`.
- If the SQLite file was hand-edited or came from an incompatible build, stop the server, remove **`~/.soloos/soloos.db`**, start again (migrations recreate tables). You can re-seed with `pnpm --filter server db:seed` if needed.

### Build and test

```bash
pnpm build    # shared → server → web (TypeScript + Vite production build)
pnpm test     # server Vitest suite
```

### Data and status

- **Database path:** `~/.soloos/soloos.db` (created automatically; not in the repo).
- **Stability:** SoloOS is under active development; HTTP shapes and behavior may change. Treat this README as a living overview, not a frozen spec.

---

## License

Distributed under the **MIT License**. See [LICENSE](./LICENSE).

---

## Architecture (theory of origin)

This architecture is not imagined from scratch. It is a cross-disciplinary blend of **classical systems engineering**, **modern personal knowledge management**, and **familiar software architecture**. The line of thought decomposes into two lenses:

- **The five subsystems: macro dynamics** — how value moves at the “whole person / whole business” level.
- **The two entity types: micro implementation** — what you actually log and model in the product.

The sections below trace that theory of origin, then state the design spine in one formula.

### 1. The five pillars — theory of the “personal value flywheel”

The five dimensions form a complete **value creation loop** for a solo operator.

#### System dynamics, value chain, and related ideas

* **Input and Output** — These map to **Jay Forrester’s system dynamics** and a simple cybernetic picture of the self as an **information processor**: input is the influx of information entropy; output is **negentropy** (order, shippable work). This aligns with **Dan Koe**–style language about **the mind as a transformer**: raw sense data in, meaning and artifacts out.

* **Audience** — Framed in terms of **network effects** and connective value. For a one-person business, long-run leverage often tracks **how many durable value relationships** you maintain, not only how busy you are in private.

* **Financial** — Here the emphasis is not balance-sheet asset hoarding but **throughput and flow** (as in **throughput accounting**): the speed of **money through the system** — **runway**, **ROI**, and the cadence of commercial feedback.

* **Energy** — Draws on **human bioenergetics** and a **Stoic** care for the operator as **finite hardware (the “CPU” of the system)**. You need visibility into **friction and depletion (heat loss)** and **stability of rhythm (cooling, recovery)**; without that, the rest of the model is fiction.

---

### 2. Two core entities: Events and Project — the developer’s mental model

The implementation spine is: **almost everything you care about is an event; durable meaning aggregates under a project.**

#### Event Sourcing, P.A.R.A., and pipelines

* **Events (software meaning)** — The conceptual twin is **event sourcing** in software: the system of record is not a mutable “current state” you silently overwrite, but an **append-only log of facts (immutable events)**.
  **Implication:** at **Review** time, you can **replay, reframe, and re-attribute** the stream. Calibration stays honest because you are not erasing history; you are interpreting it.

* **Project** — The organizing idea is close to **Tiago Forte’s P.A.R.A. model** and **August Bradley**-style **pipelines**: separate **enduring life areas (pillars / areas)** from **finite, outcome-driven efforts (projects)**. A pillar is a long-horizon theme; a project is a **bounded bet** with a target shape of “done.”

* **“Project” in GTD terms** — A project in SoloOS is also aligned with **GTD (Getting Things Done)**: a **set of actions converging on a specific deliverable or outcome** — a higher-level container for shipping, not a vague label.

---

### 3. Cybernetics for a one-person company

If the core idea had a short mathematical cartoon, it might be:

$$
\text{Value} = \int_{t_0}^{t_1} \frac{\text{Output} \times \text{Audience}}{\text{Energy Cost}} \, dt
$$

* **Cybernetics** — The **review gate** and periodic retrospectives are a deliberate **negative feedback loop**: you measure drift between intent and reality, then **steer** instead of only accumulating data.

* **First principles** — Under the surface of dozens of SaaS tools, a solo business still runs on a minimal loop: **signal in → processing → shippable value → return → enough energy to run again**. SoloOS tries to make that loop **inspectable and governable** rather than buried in inboxes and dashboards.

---

## Further reading in this repo

- [`DESIGN.md`](./DESIGN.md) — visual system, colors, and UI principles.
- [`brainstorming.md`](./brainstorming.md) — product and architecture notes (Chinese + English), aligned with the current codebase.
