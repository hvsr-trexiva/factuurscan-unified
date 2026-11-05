CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`due_at` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` text,
	`result` text
);
--> statement-breakpoint
CREATE INDEX `actions_due` ON `actions` (`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL,
	`metadata` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`request_id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`version` integer NOT NULL,
	`proposal` text NOT NULL,
	`gates` text NOT NULL,
	`pandadoc_id` text,
	`sent_at` text,
	`followup_at` text,
	`signed_at` text,
	`supplier_receipt` text,
	`paused` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
