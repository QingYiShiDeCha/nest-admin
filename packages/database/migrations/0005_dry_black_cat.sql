CREATE TABLE `sys_dept` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`name` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`leader` varchar(32),
	`phone` varchar(20),
	`email` varchar(128),
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_dept_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_dept_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sys_role_dept` (
	`role_id` bigint unsigned NOT NULL,
	`dept_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_role_dept_role_id_dept_id_pk` PRIMARY KEY(`role_id`,`dept_id`)
);
--> statement-breakpoint
ALTER TABLE `sys_user` ADD `dept_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `sys_role_dept` ADD CONSTRAINT `sys_role_dept_role_id_sys_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_role_dept` ADD CONSTRAINT `sys_role_dept_dept_id_sys_dept_id_fk` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_dept_parent_id` ON `sys_dept` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_dept_status` ON `sys_dept` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sys_role_dept_dept_id` ON `sys_role_dept` (`dept_id`);--> statement-breakpoint
ALTER TABLE `sys_user` ADD CONSTRAINT `sys_user_dept_id_sys_dept_id_fk` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_user_dept_id` ON `sys_user` (`dept_id`);