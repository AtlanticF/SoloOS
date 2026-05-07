CREATE TABLE `github_repo_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `repo_id` integer NOT NULL,
  `repo_name` text NOT NULL,
  `repo_full_name` text NOT NULL,
  `project_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_repo_bindings_repo_id_unique` ON `github_repo_bindings` (`repo_id`);
--> statement-breakpoint
CREATE TABLE `github_sync_state` (
  `id` text PRIMARY KEY NOT NULL,
  `repo_id` integer NOT NULL,
  `last_synced_sha` text,
  `last_synced_at` integer,
  `next_safe_sync_at` integer,
  `sync_status` text DEFAULT 'idle' NOT NULL,
  `error_message` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_sync_state_repo_id_unique` ON `github_sync_state` (`repo_id`);
--> statement-breakpoint
CREATE TABLE `output_metadata` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `repo_id` integer NOT NULL,
  `repo_name` text NOT NULL,
  `commit_sha` text NOT NULL,
  `commit_message` text NOT NULL,
  `author` text NOT NULL,
  `committed_at` integer NOT NULL,
  `state` text DEFAULT 'DRAFT' NOT NULL,
  `project_id` text,
  `project_name_snapshot` text,
  `additions` integer DEFAULT 0 NOT NULL,
  `deletions` integer DEFAULT 0 NOT NULL,
  `files_changed` integer DEFAULT 0 NOT NULL,
  `allocated_cost` text DEFAULT '0.00' NOT NULL,
  `realized_revenue` text DEFAULT '0.00' NOT NULL,
  `sync_version` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `output_metadata_event_id_unique` ON `output_metadata` (`event_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `output_metadata_repo_commit_uniq` ON `output_metadata` (`repo_id`, `commit_sha`);
--> statement-breakpoint
CREATE INDEX `idx_output_metadata_state` ON `output_metadata` (`state`);
--> statement-breakpoint
CREATE INDEX `idx_output_metadata_project_id` ON `output_metadata` (`project_id`);
--> statement-breakpoint
CREATE INDEX `idx_output_metadata_committed_at` ON `output_metadata` (`committed_at`);
