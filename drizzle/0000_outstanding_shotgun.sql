CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text,
	`event` text NOT NULL,
	`created_at` text NOT NULL,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` text,
	`lease_token` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `jobs_queue` ON `jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`documents` text NOT NULL,
	`consents` text NOT NULL,
	`report` text,
	`access_hash` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `requests_created` ON `requests` (`created_at`);