# harness-mini — agent map

<!-- AGENT-MAP v1 · sections carry ANCHOR: marks — jump by trigger, read one target, never preload -->

> **⌖ Context navigation map** — injected every run. A **map, not an encyclopedia**:
> read the pointer your trigger names, not the whole territory. Prune aggressively.

| Anchor | Jump when… |
|--------|------------|
| **`gate`** | any non-trivial task starts here — routing + precedence |
| **`forty`** | context feels heavy, or it's time to checkpoint/reset |
| **`mini`** · **`versioning`** | adding to / updating the harness itself |
| **`fsm`** | you need stage rules or want to advance a plan |
| **`map`** | you need to find where something lives |
| **`skills`** · **`agents`** | picking the tool or worker for a stage |
| **`trace`** | logging an event or committing a checkpoint |

## Start here — routing gate (mandatory, precedence)

<!-- ANCHOR: gate -->

When a new session starts, **MUST FIRST** run
`"$HOME/.harness-mini/bin/harness.sh" status` from the project root to check
the active workboard and its session `path:` line, then open the matching
session skill and follow it. Harness executables live in the user's runtime,
not in the project (in the harness-mini source repo itself, `./bin` and `./docs`
are the sources of that runtime and also usable directly):

- `path: init` → **`session-init`** — plan-layer work only (founder funnel,
  PRD, issues, JSON twin). **No product code on this path.**
- `path: coding` → **`session-coding`** — complete its **Getting Bearings** first turn before any product edit; then implement exactly one slice: the highest-priority `passes: false` slice the workboard's `next:` points at.

Then, before non-trivial work — a feature, a
multi-step or ambiguous change, anything cross-cutting — **route it through the
`stage-viewer` skill first**; when a harness skill and another tool both fit,
**the harness skill wins.** Trivial one-line fixes may skip the ceremony (quick
mode). The repository is the **system of record** — anything not in a
version-controlled file does not exist to you.

Quick repository map (details in the `map` anchor below):

- **Architecture definition**: `$HOME/.harness-mini/docs/ARCHITECTURE.md` (this project: `.harness-mini/architecture.md`)
- **Execution plans**: active plans live under `.harness-mini/docs/exec-plans/active/`
  (same-basename `.md` + `.json` twins). Do NOT load the full historical
  records — read only the plan you are working, and only your slice.
- **Quality & constraints**: `$HOME/.harness-mini/docs/smart-dumb.md` (maintain the 40% guardrail).
- Static docs live at `$HOME/.harness-mini/docs/` once installed (`docs/` in the harness-mini source repo).

## The one rule that governs everything: the 40% line

<!-- ANCHOR: forty -->

Context occupancy below **40%** is the *smart zone* (you reason sharply); at or
above 40% is the *dumb zone* (you degrade, lose instructions, get "context
anxiety"). Keep yourself smart:

1. **Delegate heavy work.** Any operation that would read more than ~2k tokens
   (broad searches, large files, log scans) → spawn the **explorer** agent and
   take back only its distilled answer. Sub-agents are context firewalls.
2. **Checkpoint at 40%.** When you cross the line, stop taking new work, write a
   checkpoint (`checkpoint` skill → `.harness-mini/trace/checkpoints/`), update the active
   exec-plan, and reset — while still smart enough to write a good handoff.
3. **One bounded task per session.** A session scoped to a single plan-step never
   needs to hold everything.

Estimate occupancy any time with
`"$HOME/.harness-mini/bin/ctx.sh" <used_tokens> [window]`.
Full contract: `$HOME/.harness-mini/docs/smart-dumb.md`.

## Core constraint: Mini (when changing the harness itself)

<!-- ANCHOR: mini -->

The harness *is the environment, not a program.* Before adding anything to
harness-mini: **shell-or-doc first, no environment dependence, no complex
languages.** A new capability is a Markdown skill/agent/doc by default and only
becomes a small POSIX `bin/*.sh` when it must execute — never a runtime, package
manager, or third-party binary. Question harness requirements and try to
**delete** before adding. Full contract: `$HOME/.harness-mini/docs/principles.md` → "The Mini constraint."

## Lifecycle (the state machine you live inside)

<!-- ANCHOR: fsm -->

`intake → prd → issues → implement ⇄ evaluate → checkpoint → done`, with `garden`
running orthogonally on triggers — full diagram + per-state exit conditions:
`$HOME/.harness-mini/docs/ARCHITECTURE.md#lifecycle-at-a-glance`.

- Only the **main agent** (via the `stage-viewer` skill) advances the stage.
  **No worker may promote its own work to "done."** (Anti-self-praise firewall.)
- Each requirement is a **dual-file plan** in `.harness-mini/docs/exec-plans/active/`:
  `<NNN-slug>.md` (narrative, frontmatter `stage:` = the lifecycle authority)
  + `<NNN-slug>.json` (machine workboard: `status`, `current_slice_id`,
  `slices[].passes`). Read it before acting; act only within your role's stage.
  Never alter `steps` in the JSON — they are the slice's test conditions.

## Where things live (progressive disclosure)

<!-- ANCHOR: map -->

| Need | Go to |
|------|-------|
| Core beliefs + delete-first discipline | `$HOME/.harness-mini/docs/principles.md` |
| Load-bearing assumptions + staleness tests | `$HOME/.harness-mini/docs/assumptions.md` |
| The smart/dumb (40%) contract | `$HOME/.harness-mini/docs/smart-dumb.md` |
| Lifecycle FSM diagram + layer stack | `$HOME/.harness-mini/docs/ARCHITECTURE.md#lifecycle-at-a-glance` |
| This project's architecture (recon) | `.harness-mini/architecture.md` |
| Active work + decision logs | `.harness-mini/docs/exec-plans/{active,completed}/` |
| Source-blog distillates | `references/*-llms.txt` (source repo only, never installed) |
| Skills (how to do a task) | `skills/<name>/SKILL.md` in the source repo; after install, the host's skills dir (see `harness.sh agent list`; `.agents/skills` for most hosts) |
| Sub-agents (who does the work) | `agents/<name>.md` in the source repo; after install, the host's agents dir (same command) |
| Committed checkpoints (institutional memory) | `.harness-mini/trace/checkpoints/` |
| Committed evaluation verdicts (the `done`-gate) | `.harness-mini/trace/evals/<plan>-NNN.md` |
| Ephemeral runtime traces (gitignored) | `.harness-mini/trace/runtime/` |
| Per-project lock + manifest | `$HOME/.harness-mini/projects/<project-id>/` |

## Versioning — `~/.harness-mini/bin/harness.sh` (the front door)

<!-- ANCHOR: versioning -->

`"$HOME/.harness-mini/bin/harness.sh" help` lists the commands (`version` ·
`update` · `doctor` · `status` · `report` · `release`); runtime checksums live
in `~/.harness-mini/harness/runtime.lock`, and project checksums live in
`~/.harness-mini/projects/<project-id>/harness.lock` (canonical version source: `VERSION`). Non-obvious
semantics:
`update` is **checksum-guarded** (your edits kept, upstream lands as `<file>.new`;
`.harness-mini/` never touched); `doctor` enforces the **eval-gate**
(`done` needs a `verdict: pass` in `.harness-mini/trace/evals/`); `status` ends with a
**`ready:`** verdict; `release` is source-repo only (the `release` skill).

## Skills by stage

<!-- ANCHOR: skills -->

- **orchestrate:** `stage-viewer`, `session-init` (`path: init` boards — plan-layer only), `session-coding` (`path: coding` boards — bearings first), `ralph-loop`, `checkpoint`, `grill-me`, `release`
- **intake (new project only):** `founder-check`
- **plan:** `to-prd`, `to-issues`
- **implement:** `tdd`, `slice-coding`, `parallel-slices`, `clean-code`, `refactor`
- **evaluate:** `evaluate` (tiered by risk: L0 self-check · **L1 lightweight, default** · L2 full Opus evaluator)
- **maintain:** `garden` (triggers: ≥5 checkpoints · plan-done · pre-release · smell backlog; `harness.sh status` shows `garden: DUE|ok`)

## Sub-agents (separate context windows = firewalls)

<!-- ANCHOR: agents -->

| Agent | Role | Skills | Model |
|-------|------|--------|-------|
| planner | goal → exec-plan | to-prd, to-issues | sonnet |
| generator | build one slice via TDD | tdd, slice-coding, clean-code, refactor, checkpoint | sonnet · *opus* |
| evaluator | grade vs criteria (separate window) | evaluate, clean-code | opus |
| explorer | disposable read/search → distillate | (none) | haiku |
| gardener | entropy GC, demote stale context | garden, refactor, clean-code | haiku |

Model = capability **tier** (CLI maps it), not a pinned version. The generator
auto-upgrades to the top tier (`opus`) when `HARNESS_TOP_MODEL` is set; every
other role keeps its static tier. Resolve at spawn time with
`"$HOME/.harness-mini/bin/model.sh" builder` (`HARNESS_MODEL_BUILDER=<alias>` pins an exact model).

## Tracing (best-effort, never blocks work)

<!-- ANCHOR: trace -->

Log events with `"$HOME/.harness-mini/bin/trace.sh" <agent> <stage> <event> [k=v ...]` → appends JSONL
to `.harness-mini/trace/runtime/`. Include `ctx_pct=<n>` so the 40% line is observable.
Commit milestones as checkpoints in `.harness-mini/trace/checkpoints/` (the `checkpoint` skill).

<!-- project-rules:start (project-specific; preserved across harness updates — re-append below the map after resolving AGENTS.md.new) -->
---

# Project rules

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **SoloOS** (2154 symbols, 3476 relationships, 56 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/SoloOS/context` | Codebase overview, check index freshness |
| `gitnexus://repo/SoloOS/clusters` | All functional areas |
| `gitnexus://repo/SoloOS/processes` | All execution flows |
| `gitnexus://repo/SoloOS/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
<!-- project-rules:end -->

<!-- harness-mini:begin -->
## harness-mini
This project runs on harness-mini; progress is recorded in `.harness-mini/`.
1. First run `"$HOME/.harness-mini/bin/harness.sh" status` and follow its `path:` line.
2. Read the global map `$HOME/.harness-mini/AGENTS.md` (routing gate, lifecycle, skills).
3. Skills missing? Run `"$HOME/.harness-mini/bin/harness.sh" agent list`, then `agent install <host>`.
<!-- harness-mini:end -->
