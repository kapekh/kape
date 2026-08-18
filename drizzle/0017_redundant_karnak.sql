CREATE TABLE `page_views` (
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`path` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` text,
	PRIMARY KEY(`tenant_id`, `path`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
