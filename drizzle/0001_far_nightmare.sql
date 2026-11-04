ALTER TABLE `registrations` ADD `college_id` text;--> statement-breakpoint
CREATE INDEX `registrations_college_capacity_idx` ON `registrations` (`college_id`,`competition`,`status`,`topic`);