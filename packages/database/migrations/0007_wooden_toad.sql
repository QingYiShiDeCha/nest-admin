CREATE TABLE `sys_post` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(64) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(255),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_post_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_post_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sys_user_post` (
	`user_id` bigint unsigned NOT NULL,
	`post_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_user_post_user_id_post_id_pk` PRIMARY KEY(`user_id`,`post_id`)
);
--> statement-breakpoint
ALTER TABLE `sys_user_post` ADD CONSTRAINT `sys_user_post_user_id_sys_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_post` ADD CONSTRAINT `sys_user_post_post_id_sys_post_id_fk` FOREIGN KEY (`post_id`) REFERENCES `sys_post`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_post_status` ON `sys_post` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sys_user_post_post_id` ON `sys_user_post` (`post_id`);