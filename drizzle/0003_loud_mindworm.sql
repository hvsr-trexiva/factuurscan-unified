CREATE TABLE `website_bridge` (
	`request_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_hash` text,
	`lease_until` text,
	`manifest_hash` text,
	`remote_lead_id` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `website_bridge_queue` ON `website_bridge` (`status`,`created_at`);