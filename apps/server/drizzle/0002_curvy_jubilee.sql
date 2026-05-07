CREATE TABLE `agent_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text,
	`api_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`event_id` text,
	`type` text DEFAULT 'SEED' NOT NULL,
	`fact` text DEFAULT '' NOT NULL,
	`synthesis` text DEFAULT '' NOT NULL,
	`vector` text DEFAULT '' NOT NULL,
	`value_score` integer DEFAULT 5 NOT NULL,
	`shelf_life` text DEFAULT 'LONG' NOT NULL,
	`certainty` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'INBOX' NOT NULL,
	`project_id` text,
	`cluster_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
