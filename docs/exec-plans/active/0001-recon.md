---
plan: recon
seq: 0001
stage: intake
owner: main
---
# Recon graft

This harness was grafted onto an existing project. Before any new work, map the
ground. Do NOT run the greenfield funnel — this project already exists.

## Now (resume here)
Spawn the **explorer** agent to fill this schema into `ARCHITECTURE.md`'s
"Domains & layers" section (verify commands by running them where safe):

- [ ] Entry points (file:line)
- [ ] Test command
- [ ] Build command
- [ ] Lint / typecheck command
- [ ] Main domains
- [ ] Layer structure actually in use
- [ ] Where product behaviour lives
- [ ] Where tests live (+ naming)
- [ ] Risky dirs to avoid
- [ ] Generated / vendor dirs (do not edit)
- [ ] One recommended first vertical slice

## Next
- Once mapped, wait for the user to point at a requirement, then advance the stage
  (`stage-viewer`) to `prd` and decompose with `to-issues`.

## Decisions
- (record here)
