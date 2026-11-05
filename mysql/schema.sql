CREATE TABLE IF NOT EXISTS `audit` (
	`id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`request_id` VARCHAR(512),
	`event` LONGTEXT NOT NULL,
	`created_at` VARCHAR(512) NOT NULL,
	`details` LONGTEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `jobs` (
	`id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`request_id` VARCHAR(512) NOT NULL,
	`kind` VARCHAR(512) NOT NULL,
	`created_at` VARCHAR(512) NOT NULL,
	`status` VARCHAR(512) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` LONGTEXT,
	`lease_token` LONGTEXT,
	`last_error` LONGTEXT
);


CREATE TABLE IF NOT EXISTS `rate_limits` (
	`key` VARCHAR(512) PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `requests` (
	`id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`reference` LONGTEXT NOT NULL,
	`kind` VARCHAR(512) NOT NULL,
	`created_at` VARCHAR(512) NOT NULL,
	`status` VARCHAR(512) NOT NULL,
	`payload` LONGTEXT NOT NULL,
	`documents` LONGTEXT NOT NULL,
	`consents` LONGTEXT NOT NULL,
	`report` LONGTEXT,
	`access_hash` LONGTEXT NOT NULL,
	`expires_at` LONGTEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS `actions` (
	`id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`request_id` VARCHAR(512) NOT NULL,
	`kind` VARCHAR(512) NOT NULL,
	`status` VARCHAR(512) NOT NULL,
	`due_at` VARCHAR(512) NOT NULL,
	`payload` LONGTEXT NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_token` LONGTEXT,
	`lease_until` LONGTEXT,
	`result` LONGTEXT
);


CREATE TABLE IF NOT EXISTS `artifacts` (
	`id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`request_id` VARCHAR(512) NOT NULL,
	`kind` VARCHAR(512) NOT NULL,
	`key` VARCHAR(512) NOT NULL,
	`sha256` LONGTEXT NOT NULL,
	`created_at` VARCHAR(512) NOT NULL,
	`metadata` LONGTEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `workflows` (
	`request_id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`state` LONGTEXT NOT NULL,
	`version` integer NOT NULL,
	`proposal` LONGTEXT NOT NULL,
	`gates` LONGTEXT NOT NULL,
	`pandadoc_id` LONGTEXT,
	`sent_at` LONGTEXT,
	`followup_at` LONGTEXT,
	`signed_at` LONGTEXT,
	`supplier_receipt` LONGTEXT,
	`paused` integer DEFAULT 0 NOT NULL,
	`updated_at` VARCHAR(512) NOT NULL
);

CREATE TABLE IF NOT EXISTS `email_outbox` (
	`id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`request_id` VARCHAR(512) NOT NULL,
	`kind` VARCHAR(512) NOT NULL,
	`status` VARCHAR(512) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` VARCHAR(512) NOT NULL,
	`updated_at` VARCHAR(512) NOT NULL,
	`provider_id` LONGTEXT,
	`last_error` LONGTEXT
);


CREATE TABLE IF NOT EXISTS `website_bridge` (
	`request_id` VARCHAR(512) PRIMARY KEY NOT NULL,
	`status` VARCHAR(512) DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_hash` LONGTEXT,
	`lease_until` LONGTEXT,
	`manifest_hash` LONGTEXT,
	`remote_lead_id` LONGTEXT,
	`last_error` LONGTEXT,
	`created_at` VARCHAR(512) NOT NULL,
	`updated_at` VARCHAR(512) NOT NULL
);


CREATE TABLE IF NOT EXISTS node_locks(name VARCHAR(100) PRIMARY KEY, `until` VARCHAR(40) NOT NULL);
CREATE TABLE IF NOT EXISTS node_objects(id CHAR(64) PRIMARY KEY,object_key TEXT NOT NULL,bytes BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS node_object_chunks(object_id CHAR(64) NOT NULL,part INT NOT NULL,content MEDIUMBLOB NOT NULL,PRIMARY KEY(object_id,part));
