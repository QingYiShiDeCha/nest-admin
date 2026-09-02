CREATE TABLE `sys_login_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`username` varchar(32) NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`status` enum('success','failure') NOT NULL,
	`failure_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_login_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_login_log_user_id` ON `sys_login_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_login_log_username` ON `sys_login_log` (`username`);--> statement-breakpoint
CREATE INDEX `idx_sys_login_log_status` ON `sys_login_log` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sys_login_log_created_at` ON `sys_login_log` (`created_at`);--> statement-breakpoint
INSERT INTO `sys_menu` (
	`parent_id`, `name`, `type`, `icon`, `sort`, `visible`, `keep_alive`, `status`
)
SELECT
	`system_menu`.`id`, '系统日志', 'directory', 'RiFileList3Line', 40, true, false, 'active'
FROM `sys_menu` AS `system_menu`
WHERE `system_menu`.`name` = '系统管理'
	AND `system_menu`.`parent_id` IS NULL
	AND `system_menu`.`deleted_at` IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM `sys_menu` AS `existing_log_directory`
		WHERE `existing_log_directory`.`parent_id` = `system_menu`.`id`
			AND `existing_log_directory`.`name` = '系统日志'
			AND `existing_log_directory`.`deleted_at` IS NULL
	)
LIMIT 1;--> statement-breakpoint
UPDATE `sys_menu` AS `operation_log_menu`
INNER JOIN `sys_menu` AS `system_menu`
	ON `system_menu`.`name` = '系统管理'
	AND `system_menu`.`parent_id` IS NULL
	AND `system_menu`.`deleted_at` IS NULL
INNER JOIN `sys_menu` AS `log_directory`
	ON `log_directory`.`parent_id` = `system_menu`.`id`
	AND `log_directory`.`name` = '系统日志'
	AND `log_directory`.`deleted_at` IS NULL
SET
	`operation_log_menu`.`parent_id` = `log_directory`.`id`,
	`operation_log_menu`.`icon` = 'RiHistoryLine',
	`operation_log_menu`.`sort` = 10
WHERE `operation_log_menu`.`path` = '/system/log'
	AND `operation_log_menu`.`deleted_at` IS NULL;--> statement-breakpoint
INSERT INTO `sys_menu` (
	`parent_id`, `name`, `type`, `path`, `component`, `icon`, `sort`, `visible`, `keep_alive`, `status`
)
SELECT
	`log_directory`.`id`, '登录日志', 'menu', '/system/login-log',
	'system/login-log/index', 'RiLoginBoxLine', 0, true, true, 'active'
FROM `sys_menu` AS `log_directory`
INNER JOIN `sys_menu` AS `system_menu`
	ON `system_menu`.`id` = `log_directory`.`parent_id`
	AND `system_menu`.`name` = '系统管理'
	AND `system_menu`.`deleted_at` IS NULL
WHERE `log_directory`.`name` = '系统日志'
	AND `log_directory`.`deleted_at` IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM `sys_menu` AS `existing_login_log`
		WHERE `existing_login_log`.`path` = '/system/login-log'
			AND `existing_login_log`.`deleted_at` IS NULL
	)
LIMIT 1;
