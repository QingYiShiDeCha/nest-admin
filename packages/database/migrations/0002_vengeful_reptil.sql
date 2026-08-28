CREATE TABLE `sys_operation_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`username` varchar(32),
	`module` varchar(64),
	`action` varchar(64),
	`method` varchar(10) NOT NULL,
	`path` varchar(255) NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`params` text,
	`status` enum('success','failure') NOT NULL,
	`status_code` int,
	`error_message` varchar(500),
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_operation_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_operation_log_user_id` ON `sys_operation_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_operation_log_created_at` ON `sys_operation_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sys_operation_log_status` ON `sys_operation_log` (`status`);