CREATE TABLE `render_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`tags` text DEFAULT '||' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
