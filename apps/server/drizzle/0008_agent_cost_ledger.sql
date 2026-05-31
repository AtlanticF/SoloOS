CREATE TABLE `agent_cost_provider_configs` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `label` text NOT NULL,
  `secret_ref` text NOT NULL,
  `status` text NOT NULL DEFAULT 'untested',
  `last_tested_at` integer,
  `last_error` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_cost_events` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `source` text NOT NULL,
  `project_id` text REFERENCES `projects`(`id`),
  `provider_project_id` text,
  `api_key_id` text,
  `line_item` text,
  `model` text,
  `tool_label` text,
  `amount` text NOT NULL,
  `currency` text NOT NULL,
  `usage_start` integer NOT NULL,
  `usage_end` integer NOT NULL,
  `idempotency_key` text NOT NULL,
  `raw_metadata` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_cost_events_idempotency_key_uniq` ON `agent_cost_events` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `idx_agent_cost_events_project_usage` ON `agent_cost_events` (`project_id`, `usage_start`);
--> statement-breakpoint
CREATE INDEX `idx_agent_cost_events_provider_usage` ON `agent_cost_events` (`provider`, `usage_start`);
--> statement-breakpoint
CREATE TABLE `agent_cost_project_mappings` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `match_type` text NOT NULL,
  `match_value` text NOT NULL,
  `project_id` text NOT NULL REFERENCES `projects`(`id`),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_cost_project_mappings_provider_match_uniq` ON `agent_cost_project_mappings` (`provider`, `match_type`, `match_value`);
--> statement-breakpoint
CREATE INDEX `idx_agent_cost_project_mappings_project` ON `agent_cost_project_mappings` (`project_id`);
--> statement-breakpoint
CREATE TABLE `agent_cost_sync_state` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL UNIQUE,
  `last_synced_at` integer,
  `sync_status` text NOT NULL DEFAULT 'idle',
  `error_message` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
