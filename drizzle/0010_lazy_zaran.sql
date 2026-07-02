CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text NOT NULL,
	`title_km` text,
	`blurb` text,
	`blurb_km` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`goal_amount` text,
	`cover_media_id` integer,
	`presets` text DEFAULT '[]' NOT NULL,
	`allow_custom` integer DEFAULT true NOT NULL,
	`impact_tiers` text DEFAULT '[]' NOT NULL,
	`show_supporters` integer DEFAULT true NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_campaign_slug` ON `campaigns` (`tenant_id`,`slug`);--> statement-breakpoint
ALTER TABLE `donations` ADD `campaign_id` integer REFERENCES campaigns(id);--> statement-breakpoint
ALTER TABLE `donations` ADD `visibility` text DEFAULT 'anonymous' NOT NULL;--> statement-breakpoint
ALTER TABLE `donations` ADD `display_name` text;