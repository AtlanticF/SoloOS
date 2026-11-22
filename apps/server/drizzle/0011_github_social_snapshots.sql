CREATE TABLE `github_social_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `repo_key` text NOT NULL,
  `stars` integer NOT NULL,
  `watchers` integer NOT NULL,
  `forks` integer NOT NULL,
  `captured_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_github_social_snapshots_repo_key_captured` ON `github_social_snapshots` (`repo_key`, `captured_at`);
