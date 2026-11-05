CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`provider_id` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `email_outbox_queue` ON `email_outbox` (`status`,`created_at`);