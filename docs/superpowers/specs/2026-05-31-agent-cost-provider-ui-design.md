# Agent Cost Provider UI and Expanded Official APIs

## Problem

Agent Cost Ledger has backend support for OpenAI costs, but users cannot manage
provider credentials or sync costs from the UI. The next slice must make the
cost ledger usable from Settings and expand official-provider ingestion where an
official API exists.

## Official API findings

- Anthropic/Claude: official Usage & Cost Admin API exists. The cost endpoint is
  `/v1/organizations/cost_report`; it requires an Admin API key and is not
  available for individual accounts.
- Cursor: official Team Admin API exists. Relevant endpoints include
  `/teams/spend` and `/teams/filtered-usage-events`; authentication uses a team
  admin API key via HTTP Basic auth.

## Goals

- Add Anthropic cost provider config, connection test, and sync.
- Add Cursor cost provider config, connection test, and sync.
- Add Settings UI for OpenAI, Anthropic, and Cursor provider management.
- Let users trigger cost sync from the UI and see sync results.
- Let users review unassigned cost rows and assign them to projects.

## Non-goals

- No unofficial Claude subscription/Cursor dashboard scraping.
- No personal-account-only workarounds.
- No automatic scheduled sync in this slice.
- No currency conversion.

## Acceptance criteria

- Provider config UI saves, masks, tests, and deletes OpenAI/Anthropic/Cursor
  credentials.
- Sync UI can trigger a date-range sync for each configured official provider.
- Anthropic sync imports official cost rows idempotently.
- Cursor sync imports official usage/spend rows idempotently.
- Unassigned cost rows are visible in Settings and can be assigned to a project.
- Existing review and project economics behavior continues to use all assigned
  cost events regardless of provider.

