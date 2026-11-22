CREATE TABLE `agent_cost_local_activity_events` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `project_path` text NOT NULL,
  `event_count` integer NOT NULL,
  `input_tokens` integer,
  `output_tokens` integer,
  `raw_metadata` text NOT NULL DEFAULT '{}',
  `idempotency_key` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_cost_local_activity_events_idempotency_key_uniq` ON `agent_cost_local_activity_events` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `idx_agent_cost_local_activity_events_provider_occurred` ON `agent_cost_local_activity_events` (`provider`, `occurred_at`);
--> statement-breakpoint
CREATE INDEX `idx_agent_cost_local_activity_events_project_path_occurred` ON `agent_cost_local_activity_events` (`project_path`, `occurred_at`);
