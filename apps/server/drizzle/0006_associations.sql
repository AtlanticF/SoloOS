CREATE TABLE `associations` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES `projects`(`id`),
  `source_id` text NOT NULL REFERENCES `insights`(`id`),
  `target_id` text NOT NULL,
  `match_score` real,
  `reasoning` text,
  `status` text NOT NULL DEFAULT 'PENDING_REVIEW',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assoc_source_target_uniq` ON `associations` (`source_id`, `target_id`);
--> statement-breakpoint
CREATE INDEX `idx_assoc_project_status` ON `associations` (`project_id`, `status`);
--> statement-breakpoint
CREATE INDEX `idx_assoc_target` ON `associations` (`target_id`);
--> statement-breakpoint
CREATE INDEX `idx_assoc_source` ON `associations` (`source_id`);
