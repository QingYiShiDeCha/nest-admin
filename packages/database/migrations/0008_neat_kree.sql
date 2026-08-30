CREATE TABLE `sys_dept_transfer_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`dept_id` bigint unsigned NOT NULL,
	`dept_name` varchar(64) NOT NULL,
	`from_parent_id` bigint unsigned,
	`from_parent_name` varchar(64),
	`to_parent_id` bigint unsigned,
	`to_parent_name` varchar(64),
	`reason` varchar(255) NOT NULL,
	`operator_id` bigint unsigned,
	`operator_name` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_dept_transfer_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_dept_transfer_dept_created` ON `sys_dept_transfer_log` (`dept_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sys_dept_transfer_operator_id` ON `sys_dept_transfer_log` (`operator_id`);