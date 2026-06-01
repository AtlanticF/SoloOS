# Personal Agent Cost Connectors Design

## Problem

SoloOS can already ingest official team/admin API agent cost, but individual
Claude, Cursor, and Codex accounts often do not expose an admin billing API.
For personal paid accounts, the product still needs a defensible cost signal so
project ROI includes the user's real subscription spend. The MVP must let a
user configure each personal agent subscription once, compute daily average
cost, attribute that cost to projects by local agent activity where possible,
and keep official API cost, allocated personal cost, and unallocated personal
cost auditable.

## Product Decisions

- Personal local estimates are allowed to count as product cost because they are
  the only available signal for individual accounts.
- Personal subscriptions are configured separately per provider: Claude, Cursor,
  Codex, and future providers.
- Free personal accounts do not contribute cost.
- Paid personal accounts use user-confirmed monthly subscription fee divided
  into daily average cost.
- Same-day personal cost is allocated to projects by each project's share of
  local agent activity.
- Activity ingestion uses metadata only: provider, occurred_at, project_path,
  event_count, and optional token fields.
- SoloOS must not ingest prompt text, response text, or full transcript content.
- Local connector scope is detect-and-manual-sync only.
- The server may run only whitelisted provider commands or read whitelisted
  local paths.
- The UI may show total agent cost, but must expose official API cost,
  allocated personal subscription cost, and unallocated personal subscription
  cost as separate components.

## Provider Research

- Claude Agent SDK officially exposes usage and estimated cost fields such as
  `total_cost_usd`, but Anthropic documents these as client-side estimates, not
  authoritative billing data. This is acceptable only as activity/cost metadata
  for personal subscriptions, not as team billing truth.
- Cursor Agent CLI officially supports `--print --output-format json` and
  `stream-json`; the documented output includes session, duration, cwd, model,
  and event data, but not authoritative personal billing.
- Codex CLI is an official local terminal agent and can be used with a ChatGPT
  plan or API key. Public CLI documentation supports local execution, but
  personal subscription billing should be modeled from user-confirmed plan cost,
  not inferred from an admin API.

## Acceptance Criteria

- [ ] A personal agent subscription can be created, listed, edited, disabled,
      and deleted per provider. Machine check: API tests.
- [ ] Personal subscription rows capture provider, account type, billing status,
      monthly amount, currency, effective dates, and source/confidence metadata.
      Machine check: schema/type tests.
- [ ] Free or unpaid personal accounts produce zero daily cost. Paid accounts
      compute daily average cost from user-confirmed monthly fee. Machine check:
      service tests.
- [ ] Local connector detection reports installed/missing/unsupported for
      Claude, Cursor, and Codex without reading prompt or response content.
      Machine check: service tests with command/path mocks.
- [ ] Manual sync imports local agent activity metadata only and rejects
      transcript content. Machine check: parser/service tests.
- [ ] Same-day subscription cost is allocated by project activity share; days
      with no attributable activity create unallocated personal cost instead of
      forced project assignment. Machine check: service tests.
- [ ] Agent cost summaries expose total cost plus the split between official
      API cost, allocated personal subscription cost, and unallocated personal
      subscription cost. Machine check: API tests; human check: UI readability.
- [ ] Settings UI lets the user configure personal subscriptions, see connector
      detection state, run a manual sync, and inspect the source split. Machine
      check: build; human check: local UI smoke test.
- [ ] Existing official team/admin API sync for OpenAI, Anthropic, and Cursor
      continues to work unchanged. Machine check: existing API tests.

## Out Of Scope

- Background daemon or continuous local monitoring.
- Remote execution of arbitrary local commands.
- Uploading or storing prompt, response, or transcript content.
- Inferring exact personal billing from provider private account pages.
- Currency conversion beyond storing the configured currency.
- Per-message or per-token ROI allocation for personal subscription plans.
- Team/admin API redesign.

## Vertical Slices

1. Personal subscription schema and API.
2. Daily cost calculation and zero-cost handling for free accounts.
3. Local connector detection for Claude, Cursor, and Codex.
4. Manual activity metadata sync with content rejection.
5. Daily allocation into project and unallocated cost events.
6. Settings UI for configuration, detection, sync, and cost-source breakdown.

## Open Evaluation Notes

- Treat local connector support as provider-specific. If a provider lacks
  stable local metadata, mark it unsupported instead of scraping transcripts.
- Evaluator should verify no arbitrary command execution path is introduced.
- Evaluator should verify the UI never collapses official and personal costs
  into an unauditable number.

## Source Links Checked

- Claude Agent SDK cost tracking:
  https://code.claude.com/docs/en/agent-sdk/cost-tracking
- Cursor Agent CLI output format:
  https://docs.cursor.com/en/cli/reference/output-format
- Cursor Agent CLI parameters:
  https://docs.cursor.com/en/cli/reference/parameters
- OpenAI Codex CLI:
  https://github.com/openai/codex
