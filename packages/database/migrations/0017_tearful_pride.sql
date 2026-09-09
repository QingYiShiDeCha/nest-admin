CREATE TABLE `sys_oauth_identity` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`provider_key` varchar(32) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`username` varchar(128),
	`email` varchar(255),
	`avatar` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_oauth_identity_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_oauth_identity_provider_subject` UNIQUE(`provider_key`,`subject`)
);
--> statement-breakpoint
CREATE TABLE `sys_oauth_provider` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`provider_key` enum('github','dingtalk','wechat') NOT NULL,
	`name` varchar(64) NOT NULL,
	`client_id` varchar(255) NOT NULL,
	`client_secret_encrypted` text NOT NULL,
	`authorization_url` varchar(500) NOT NULL,
	`token_url` varchar(500) NOT NULL,
	`user_info_url` varchar(500) NOT NULL,
	`scopes` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`auto_register` boolean NOT NULL DEFAULT false,
	`sort` int NOT NULL DEFAULT 0,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_oauth_provider_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_oauth_provider_key` UNIQUE(`provider_key`)
);
--> statement-breakpoint
ALTER TABLE `sys_oauth_identity` ADD CONSTRAINT `sys_oauth_identity_user_id_sys_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_oauth_identity_user_id` ON `sys_oauth_identity` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_oauth_provider_enabled` ON `sys_oauth_provider` (`enabled`);