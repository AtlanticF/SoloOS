ALTER TABLE `events` ADD COLUMN `title` text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE `events` SET `title` = `id` WHERE `title` = '' OR `title` IS NULL;
