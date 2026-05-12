# SoloOS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

SoloOS is a data-driven “one-person company” operating system for developers: capture work as **entries**, turn them into **events** along five business pillars, group them by **project**, and use **review gates** so reflection stays mandatory.

---

## Quick start

From the repository root, install dependencies and start the API plus web UI:

```bash
git clone https://github.com/AtlanticF/SoloOS.git
cd SoloOS
corepack enable
pnpm install
pnpm dev
```

Then open **http://localhost:5173** in your browser. The Vite dev server proxies `/api` and `/webhooks` to the backend on **http://localhost:3000**.

On first boot the server creates **`~/.soloos/soloos.db`** (SQLite), runs migrations, and logs `SoloOS server running at http://localhost:3000`.

Optional sample data:

```bash
pnpm --filter server db:seed
```

Interactive API reference: **http://localhost:3000/docs** (Swagger UI).

---

## Run from source

### Requirements

- **Node.js** 20 or newer (LTS recommended)
- **pnpm** 9 or newer ([install](https://pnpm.io/installation); `corepack enable` then `corepack prepare pnpm@latest --activate` works on many setups)

`better-sqlite3` is a native dependency; `pnpm install` builds it for your current Node/OS.

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
| `pnpm dev` | API (`apps/server`, port **3000**) and web (`apps/web`, port **5173**) together via `concurrently` |
| `pnpm --filter server dev` | API only |
| `pnpm --filter web dev` | Web only (expects API on 3000 for proxied routes) |

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
