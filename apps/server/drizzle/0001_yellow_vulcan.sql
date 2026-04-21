ALTER TABLE `event_links` RENAME TO `event_links_old`;
--> statement-breakpoint
CREATE TABLE `event_links` (
	`source_event_id` text NOT NULL,
	`target_event_id` text NOT NULL,
	`link_type` text NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`created_by` text DEFAULT 'ai' NOT NULL,
	PRIMARY KEY(`source_event_id`, `target_event_id`, `link_type`),
	FOREIGN KEY (`source_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `event_links` SELECT * FROM `event_links_old`;
--> statement-breakpoint
DROP TABLE `event_links_old`;
