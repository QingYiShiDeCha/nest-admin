CREATE TABLE `sys_refresh_token` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`jti` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`replaced_by_jti` varchar(64),
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_refresh_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_refresh_token_jti` UNIQUE(`jti`)
);
--> statement-breakpoint
ALTER TABLE `sys_refresh_token` ADD CONSTRAINT `sys_refresh_token_user_id_sys_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_refresh_token_user_id` ON `sys_refresh_token` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_refresh_token_expires_at` ON `sys_refresh_token` (`expires_at`);