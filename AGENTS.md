# harness-mini — agent map

> This file is a **map, not an encyclopedia** (~100 lines). It is injected into
> every run. Keep it small: a table of contents pointing at the system of record.
> If everything is "important," nothing is. Prune aggressively.

## Start here — routing gate (precedence)

This project runs on **harness-mini**. Before non-trivial work — a feature, a
multi-step or ambiguous change, anything cross-cutting — **route it through the
`stage-viewer` skill first**, and prefer harness-mini's lifecycle, skills, and
sub-agents over ad-hoc tools or other installed plugins. When a harness skill and
another tool both fit, **the harness skill wins.** Trivial one-line fixes may skip
the ceremony (quick mode). On entering a fresh session, `stage-viewer` first
checks for a newer harness-mini (`bin/harness.sh version`) and prompts you to
update. The rest of this file is the map.

You are operating inside the **harness-mini** framework. The repository is the
system of record: anything not in a version-controlled file does not exist to
you. Read the pointer you need, when you need it — never preload everything.

## The one rule that governs everything: the 40% line

Context occupancy below **40%** is the *smart zone* (you reason sharply); at or
above 40% is the *dumb zone* (you degrade, lose instructions, get "context
anxiety"). Keep yourself smart:

1. **Delegate heavy work.** Any operation that would read more than ~2k tokens
   (broad searches, large files, log scans) → spawn the **explorer** agent and
   take back only its distilled answer. Sub-agents are context firewalls.
2. **Checkpoint at 40%.** When you cross the line, stop taking new work, write a
   checkpoint (`checkpoint` skill → `.trace/checkpoints/`), update the active
   exec-plan, and reset. Hand off *while you are still smart enough to write a
   good handoff.*
3. **One bounded task per session.** A session scoped to a single plan-step never
   needs to hold everything.

Estimate occupancy any time with `bin/ctx.sh <used_tokens> [window]`.
Full contract: `docs/smart-dumb.md`.

## Core constraint: Mini (when changing the harness itself)

The harness *is the environment, not a program.* Before adding anything to
harness-mini: **shell-or-doc first, no environment dependence, no complex
languages.** A new capability is a Markdown skill/agent/doc by default and only
becomes a small POSIX `bin/*.sh` when it must execute — never a runtime, package
manager, or third-party binary. Apply the Five-Step to the harness itself: try to
**delete** before you add. Full contract: `docs/principles.md` → "The Mini constraint."

## Lifecycle (the state machine you live inside)

```
intake → prd → issues → implement ⇄ evaluate → checkpoint → done
                           ↑___________|   (loop until criteria pass)
       garden ──── runs orthogonally, on triggers ────
```

- Only the **main agent** (via the `stage-viewer` skill) advances the stage.
  **No worker may promote its own work to "done."** (Anti-self-praise firewall.)
- Each requirement is a file in `docs/exec-plans/active/<plan>.md` with a
  `stage:` field. Read it before acting; act only within your role's stage.

## Where things live (progressive disclosure)

| Need | Go to |
|------|-------|
| Core beliefs + Musk's Five-Step core-mind | `docs/principles.md` |
| The smart/dumb (40%) contract | `docs/smart-dumb.md` |
| Layer stack + lifecycle FSM detail | `ARCHITECTURE.md` |
| Active work + decision logs | `docs/exec-plans/active/` |
| Source-blog distillates | `docs/references/*-llms.txt` |
| Skills (how to do a task) | `.claude/skills/<name>/SKILL.md` (one folder per skill) |
| Sub-agents (who does the work) | `.claude/agents/<name>.md` (flat) |
| Committed checkpoints (institutional memory) | `.trace/checkpoints/` |
| Ephemeral runtime traces (gitignored) | `.trace/runtime/` |

## Versioning (the `harness.sh` CLI)

`bin/harness.sh` is the front door. Installed version + checksums live in
`harness/harness.lock` (canonical source version: `VERSION`).

- `harness.sh version` — installed version (+ best-effort latest). When a newer
  release exists, `version`/`status`/`doctor` all surface an **update reminder**
  (best-effort, silent offline). `stage-viewer` runs this on session entry.
- `harness.sh update [--src DIR]` — pull a newer harness in, checksum-guarded:
  untouched files are refreshed, **your edits are kept** (upstream lands as
  `<file>.new`), new files are added; `docs/exec-plans/` and `.trace/` are never
  touched.
- `harness.sh doctor` — install health (ok/warn/fail; exit 1 on a fail), incl.
  source↔`.claude` mirror divergence and unresolved `.new` files.
- `harness.sh status` — current work state for cold resume: active plans + stages,
  latest checkpoint per plan, `.new` conflicts, last `ctx_pct`, resumability.
- `harness.sh release <x.y.z>` — source-repo only; bump + tag + GitHub release
  (gated on semver + green tests + clean tree). See the `release` skill.

## Skills by stage

- **orchestrate:** `stage-viewer`, `ralph-loop`, `checkpoint`, `five-step`, `grill-me`, `release`
- **intake (new project only):** `founder-check`
- **plan:** `to-prd`, `to-issues`
- **implement:** `tdd`, `slice-coding`, `parallel-slices`, `clean-code`, `refactor`
- **evaluate:** `evaluate` (tiered by risk: L0 self-check · **L1 lightweight, default** · L2 full Opus evaluator)
- **maintain:** `garden` (triggers: ≥5 checkpoints · plan-done · pre-release · smell backlog; `harness.sh status` shows `garden: DUE|ok`)

## Sub-agents (separate context windows = firewalls)

| Agent | Role | Skills | Model |
|-------|------|--------|-------|
| planner | goal → exec-plan | to-prd, to-issues, five-step | sonnet |
| generator | build one slice via TDD | tdd, slice-coding, clean-code, refactor, checkpoint | sonnet |
| evaluator | grade vs criteria (separate window) | evaluate, clean-code | opus |
| explorer | disposable read/search → distillate | (none) | haiku |
| gardener | entropy GC, demote stale context | garden, refactor, clean-code | haiku |

## Tracing (best-effort, never blocks work)

Log events with `bin/trace.sh <agent> <stage> <event> [k=v ...]` → appends JSONL
to `.trace/runtime/`. Include `ctx_pct=<n>` so the 40% line is observable.
Commit milestones as checkpoints in `.trace/checkpoints/` (the `checkpoint` skill).

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
