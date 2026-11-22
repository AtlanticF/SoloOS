# SoloOS Agent Cost Ledger — MVP PRD

Date: 2026-05-31
Status: Draft for review
Stage: prd

## Problem

SoloOS is valuable only if it helps a developer-founder see the real economics of
their work. Today the system can connect input insights, GitHub output commits,
associations, and financial return, but it does not account for AI agent spend.
That leaves a blind spot: a project can look productive while quietly burning
Codex, Claude, or API usage cost. The MVP must make AI agent usage visible as a
cost center and attach it to SoloOS projects so weekly review can answer whether
agent-assisted output is creating margin or just activity.

## Product Bet

Developer-founders will care about SoloOS more if it can show:

- which projects consumed AI agent budget,
- whether that cost produced output,
- whether that output produced revenue or audience return,
- and which project should continue, pause, be killed, or be doubled down on.

The smallest useful version is not a universal billing dashboard. It is a local
agent-cost ledger that imports authoritative OpenAI cost data, lets users assign
unmapped costs to projects, and surfaces those costs inside weekly review.

## Sources And Provider Reality

- OpenAI provides organization usage and costs endpoints. The Costs result
  includes monetary amount, currency, and grouping dimensions such as
  `project_id`, `api_key_id`, and `line_item`. OpenAI recommends the Costs
  endpoint for financial reconciliation because it aligns more closely with
  billing than granular usage records.
- Anthropic provides Usage and Cost Admin APIs such as
  `/v1/organizations/usage_report/messages` and
  `/v1/organizations/cost_report`, but access depends on organization/admin
  capability and is not guaranteed for every individual user.
- Claude Code SDK token/cost fields can be useful for approximate budgeting, but
  they are not authoritative billing data. They must not be treated as final
  financial records.

MVP decision: implement OpenAI official Costs API first, plus manual cost events
for Claude/Codex/other tools. Anthropic official connector is designed as a
provider interface but not required for MVP completion.

## Cost Source Policy

SoloOS only treats costs as authoritative when they come from an official
provider cost endpoint or provider billing export. SDK/session token fields,
local agent logs, screenshots, and manually entered numbers are useful but must
be labeled as estimates or manual records.

Cost source tiers:

1. `official_api`: imported from an official cost/billing API.
2. `official_export`: imported from an official CSV or billing export.
3. `sdk_estimate`: computed from official SDK/session usage fields.
4. `manual`: entered by the user, including fixed subscription allocation.

MVP implements `official_api` for OpenAI and `manual` for all providers. If a
Codex, Claude, or Claude Code usage form is covered by a subscription, seat, or
enterprise report that has no accessible official API for the user, MVP records
it as a manual recurring or one-off cost allocation rather than scraping
unofficial endpoints.

## Definitions

**Agent cost event**: A dated monetary cost record from an AI provider or manual
entry.

**Provider project**: The provider-side grouping identifier, such as an OpenAI
project ID.

**SoloOS project mapping**: A local rule mapping provider project IDs, API key
IDs, or line items to SoloOS project IDs.

**Unassigned agent cost**: A cost event that has been imported but cannot yet be
attributed to a SoloOS project.

**Authoritative cost**: A cost imported from an official provider cost endpoint.

**Estimated cost**: A cost derived from SDK/session usage or user entry. MVP
supports manual estimated cost records but labels them clearly.

## User Stories

### US1: Connect Agent Cost Provider

As a developer-founder, I can add an OpenAI Admin/API key with permission to read
organization cost data, test the connection, and see whether cost sync is ready.

Acceptance criteria:
- [ ] Saving a provider config stores only server-side secrets and returns a
      masked identifier to the frontend.
- [ ] Testing an OpenAI cost provider returns success only when the Costs API can
      be queried for a small recent time range.
- [ ] Provider test errors distinguish invalid credentials, missing permission,
      network failure, and unsupported provider.

### US2: Import OpenAI Costs

As a user, I can trigger a cost sync for a date range and import OpenAI cost
buckets into SoloOS without duplicates.

Acceptance criteria:
- [ ] A manual sync imports OpenAI cost rows grouped by day and at least one of
      `project_id`, `api_key_id`, or `line_item` when available.
- [ ] Imported records store amount, currency, provider, source, usage window,
      grouping keys, and raw provider metadata.
- [ ] Re-running sync for the same date range does not create duplicate cost
      events.
- [ ] Sync status records last successful sync time and the last error message.

### US3: Manual Cost Fallback

As a user without Anthropic/OpenAI admin access, I can manually enter an AI agent
cost and assign it to a project.

Acceptance criteria:
- [ ] User can create a manual cost event with provider, amount, currency, usage
      start/end, optional model/tool label, and optional project.
- [ ] Manual records are marked `source = manual` and never confused with
      official provider records.
- [ ] Manual records appear in the same review and project summaries as imported
      costs.

### US4: Map Provider Costs To Projects

As a user, I can map provider grouping keys to SoloOS projects so future cost
imports are attributed automatically.

Acceptance criteria:
- [ ] User can create mappings from provider + provider_project_id, api_key_id,
      or line_item to a SoloOS project.
- [ ] New imported costs use mappings at ingestion time.
- [ ] Unmapped costs are saved as unassigned, not dropped.
- [ ] User can assign an unassigned cost event to a project after import.

### US5: Weekly Review Shows Agent Cost

As a user, I can see agent costs in weekly review and make a project decision
using real cost context.

Acceptance criteria:
- [ ] Weekly review snapshot includes total agent cost, assigned agent cost,
      unassigned agent cost, and project-level agent cost.
- [ ] Review highlights projects with output but no financial/audience return
      and non-zero agent cost.
- [ ] Review requires at least one project decision when agent cost is non-zero:
      `continue`, `pause`, `kill`, or `double_down`.
- [ ] Completed review stores the cost snapshot used at decision time.

## Out Of Scope

- Real-time cost streaming.
- Full OpenAI usage-detail ingestion beyond what is needed for cost attribution.
- Anthropic official Admin API implementation in MVP.
- Claude Code subscription-limit scraping or unofficial endpoints.
- Automatic subscription proration beyond user-entered manual allocation.
- Automatic per-commit token attribution.
- Multi-currency conversion.
- Cloud sync, team billing, invoices, or tax/accounting workflows.
- Replacing provider dashboards.

## Data Model

### `agent_cost_provider_configs`

Stores provider connection metadata and encrypted/opaque secret reference.

Fields:
- `id`
- `provider`: `openai | anthropic`
- `label`
- `secret_ref`
- `status`: `untested | ok | error`
- `last_tested_at`
- `last_error`
- `created_at`
- `updated_at`

MVP stores only OpenAI configs through the UI. Anthropic can exist in the enum so
the provider interface is stable, but Anthropic UI may be disabled until the
connector ships.

### `agent_cost_events`

Fields:
- `id`
- `provider`: `openai | anthropic | manual`
- `source`: `official_api | official_export | sdk_estimate | manual`
- `project_id` nullable
- `provider_project_id` nullable
- `api_key_id` nullable
- `line_item` nullable
- `model` nullable
- `tool_label` nullable
- `amount` decimal string
- `currency`
- `usage_start`
- `usage_end`
- `idempotency_key`
- `raw_metadata`
- `created_at`
- `updated_at`

Idempotency key:

```text
provider + source + usage_start + usage_end + provider_project_id + api_key_id + line_item + amount + currency
```

Manual events use a generated idempotency key and are never deduplicated against
official records.

### `agent_cost_project_mappings`

Fields:
- `id`
- `provider`
- `match_type`: `provider_project_id | api_key_id | line_item`
- `match_value`
- `project_id`
- `created_at`
- `updated_at`

Mapping precedence:
1. `provider_project_id`
2. `api_key_id`
3. `line_item`

If multiple mappings match at the same precedence, sync leaves the event
unassigned and records an ambiguity warning.

## API

### Provider Config

- `GET /api/agent-cost/providers`
- `POST /api/agent-cost/providers`
- `POST /api/agent-cost/providers/:id/test`
- `DELETE /api/agent-cost/providers/:id`

### Cost Sync

- `POST /api/agent-cost/sync`

Request:

```json
{
  "provider": "openai",
  "start_time": 1761955200,
  "end_time": 1764547200
}
```

Response:

```json
{
  "imported": 12,
  "updated": 0,
  "skipped": 12,
  "unassigned": 3,
  "errors": []
}
```

### Manual Cost Events

- `POST /api/agent-cost/events`
- `GET /api/agent-cost/events`
- `PATCH /api/agent-cost/events/:id`

### Project Mappings

- `GET /api/agent-cost/mappings`
- `POST /api/agent-cost/mappings`
- `DELETE /api/agent-cost/mappings/:id`

### Review Summary

Existing review endpoints include agent cost summary in the snapshot. A separate
read endpoint can support UI widgets:

- `GET /api/agent-cost/summary?period_start=&period_end=`

## UI

### Settings

Add an Agent Cost section:
- OpenAI cost provider config.
- Test connection.
- Last sync status.
- Manual sync button.
- Link to create mappings.

### Agent Cost Mapping View

Small table:
- provider key,
- mapped SoloOS project,
- match type,
- last imported cost count.

Unassigned cost queue:
- amount,
- date range,
- provider grouping keys,
- assign project,
- ignore for now.

### Weekly Review

Add Agent Cost panel:
- total agent cost,
- assigned vs unassigned cost,
- top cost projects,
- projects with cost but no return,
- required decision selector when cost is non-zero.

Decision options:
- `continue`
- `pause`
- `kill`
- `double_down`

## Vertical Slices

1. Schema + manual cost event
   - Create cost tables.
   - Add manual cost event API.
   - Show manual costs in review summary.

2. OpenAI provider + sync
   - Store OpenAI cost provider config.
   - Test connection.
   - Import official costs idempotently.

3. Project mapping + unassigned queue
   - Add mapping table/API.
   - Apply mappings during import.
   - Let user assign unassigned costs.

4. Review decision loop
   - Add agent cost snapshot to weekly review.
   - Require project decision when agent cost is non-zero.
   - Persist snapshot and decision.

5. Output/project economics view
   - Show project-level `financial_return - output_allocated_cost - agent_cost`.
   - Highlight negative-margin projects.

## Success Metrics

Business validation:
- Five target users can connect or manually enter cost data in under ten minutes.
- At least three users discover one project with meaningful agent cost they had
  not been accounting for.
- At least two users change a weekly project decision because of agent cost.

Product quality:
- Imported official costs are idempotent.
- Unassigned costs are visible and never silently discarded.
- Weekly review remains understandable without reading provider billing docs.

## Risks

- Provider permissions may block individual users from official cost APIs.
  Mitigation: manual cost fallback is first-class.
- Cost grouping may not map cleanly to SoloOS projects.
  Mitigation: explicit mapping and unassigned queue.
- Users may over-focus on cost and under-value leverage.
  Mitigation: review presents cost next to output and return, not as a standalone
  shame metric.
- Unofficial Claude/Codex usage scraping may be tempting.
  Mitigation: MVP forbids unofficial endpoints and labels SDK/session costs as
  estimates only.

## Open Questions Resolved For MVP

- First official provider: OpenAI.
- First Anthropic support: manual cost event only.
- Currency: store provider currency, no conversion.
- Cost attribution granularity: project-level first, not per commit.
- Review requirement: one project decision only when agent cost is non-zero.

## Next Step

Move to `issues` stage and decompose the vertical slices into implementation
tasks after this PRD is reviewed.
