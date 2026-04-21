CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`source` text DEFAULT 'cli' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`quick_tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_links` (
	`source_event_id` text NOT NULL,
	`target_event_id` text NOT NULL,
	`link_type` text NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`created_by` text DEFAULT 'ai' NOT NULL,
	FOREIGN KEY (`source_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`pillar` text NOT NULL,
	`project_id` text,
	`impact_score` integer DEFAULT 1 NOT NULL,
	`classifier` text DEFAULT 'rule' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`match_rules` text DEFAULT '{}' NOT NULL,
	`is_auto` integer DEFAULT 1 NOT NULL,
	`first_event_at` integer,
	`last_event_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`snapshot` text DEFAULT '[]' NOT NULL,
	`reflection` text,
	`ai_insight` text,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
