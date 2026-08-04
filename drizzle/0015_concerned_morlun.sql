ALTER TABLE `projects` ADD `start_date` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `end_date` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `target_areas` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `snapshots` text DEFAULT '[]' NOT NULL;