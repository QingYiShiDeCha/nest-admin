CREATE TABLE `sys_scheduled_task_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`task_id` bigint unsigned NOT NULL,
	`task_name` varchar(64) NOT NULL,
	`task_key` varchar(128) NOT NULL,
	`trigger_type` enum('scheduled','manual') NOT NULL,
	`status` enum('running','success','failure','skipped') NOT NULL,
	`operator_id` bigint unsigned,
	`operator_username` varchar(32),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`finished_at` timestamp,
	`duration_ms` int,
	`result` text,
	`error_message` varchar(1000),
	CONSTRAINT `sys_scheduled_task_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sys_scheduled_task` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`code` varchar(128),
	`task_key` varchar(128) NOT NULL,
	`cron_expression` varchar(64) NOT NULL,
	`timezone` varchar(64) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`built_in` boolean NOT NULL DEFAULT false,
	`remark` varchar(255),
	`last_run_at` timestamp,
	`last_run_status` enum('running','success','failure','skipped'),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_scheduled_task_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_scheduled_task_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_scheduled_task_log_task_started` ON `sys_scheduled_task_log` (`task_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_sys_scheduled_task_log_status` ON `sys_scheduled_task_log` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sys_scheduled_task_log_started_at` ON `sys_scheduled_task_log` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_sys_scheduled_task_key` ON `sys_scheduled_task` (`task_key`);--> statement-breakpoint
CREATE INDEX `idx_sys_scheduled_task_status` ON `sys_scheduled_task` (`status`);--> statement-breakpoint
INSERT INTO `sys_menu` (
	`parent_id`, `name`, `type`, `path`, `component`, `icon`, `sort`, `visible`, `keep_alive`, `status`
)
SELECT
	`system_menu`.`id`, '定时任务', 'menu', '/system/scheduled-task',
	'system/scheduled-task/index', 'RiTimerLine', 65, true, true, 'active'
FROM `sys_menu` AS `system_menu`
WHERE `system_menu`.`name` = '系统管理'
	AND `system_menu`.`parent_id` IS NULL
	AND `system_menu`.`deleted_at` IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM `sys_menu` AS `existing_scheduled_task`
		WHERE `existing_scheduled_task`.`path` = '/system/scheduled-task'
			AND `existing_scheduled_task`.`deleted_at` IS NULL
	)
LIMIT 1;
