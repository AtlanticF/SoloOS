CREATE TABLE `agent_cost_personal_subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `account_type` text NOT NULL,
  `billing_status` text NOT NULL,
  `monthly_amount` text NOT NULL,
  `currency` text NOT NULL,
  `effective_start` integer NOT NULL,
  `effective_end` integer,
  `source` text NOT NULL DEFAULT 'user_configured',
  `confidence` text NOT NULL DEFAULT 'user_confirmed',
  `enabled` integer NOT NULL DEFAULT 1,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_agent_cost_personal_subscriptions_provider_enabled` ON `agent_cost_personal_subscriptions` (`provider`, `enabled`);
