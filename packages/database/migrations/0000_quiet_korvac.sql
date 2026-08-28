CREATE TABLE `sys_user` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(32) NOT NULL,
	`password` varchar(100) NOT NULL,
	`nickname` varchar(32),
	`email` varchar(128),
	`phone` varchar(20),
	`avatar` varchar(255),
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sys_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_user_username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_user_status` ON `sys_user` (`status`);