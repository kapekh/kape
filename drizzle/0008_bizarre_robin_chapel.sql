CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`name_en` text NOT NULL,
	`name_km` text,
	`position` text,
	`tier` text DEFAULT 'staff' NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`slug` text,
	`photo_media_id` integer,
	`staff_no` text,
	`sex` text,
	`phone` text,
	`email` text,
	`program` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photo_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_people_tier` ON `people` (`tenant_id`,`tier`);--> statement-breakpoint
CREATE INDEX `ix_people_public` ON `people` (`tenant_id`,`is_public`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_org_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`title` text,
	`person_id` integer,
	`sort` integer DEFAULT 0 NOT NULL,
	`pos_x` integer,
	`pos_y` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `org_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_org_nodes`("id", "tenant_id", "parent_id", "name", "title", "person_id", "sort", "pos_x", "pos_y", "created_at", "updated_at") SELECT "id", "tenant_id", "parent_id", "name", "title", "person_id", "sort", "pos_x", "pos_y", "created_at", "updated_at" FROM `org_nodes`;--> statement-breakpoint
DROP TABLE `org_nodes`;--> statement-breakpoint
ALTER TABLE `__new_org_nodes` RENAME TO `org_nodes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_org_parent` ON `org_nodes` (`tenant_id`,`parent_id`);