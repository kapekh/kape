ALTER TABLE `pages` ADD `parent_id` integer REFERENCES pages(id);--> statement-breakpoint
ALTER TABLE `pages` ADD `segment` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `sort_order` integer DEFAULT 0 NOT NULL;