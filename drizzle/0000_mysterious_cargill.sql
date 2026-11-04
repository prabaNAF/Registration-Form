CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`competition` text NOT NULL,
	`topic` text,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`payload` text NOT NULL,
	`request_key` text NOT NULL,
	`created_at` text NOT NULL,
	`cancelled_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_request_key_unique` ON `registrations` (`request_key`);--> statement-breakpoint
CREATE INDEX `registrations_capacity_idx` ON `registrations` (`competition`,`status`,`topic`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
