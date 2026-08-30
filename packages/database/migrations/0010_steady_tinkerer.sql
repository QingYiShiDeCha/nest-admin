CREATE TABLE `sys_system_config` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`config_key` varchar(128) NOT NULL,
	`config_value` text NOT NULL,
	`value_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`built_in` boolean NOT NULL DEFAULT false,
	`remark` varchar(255),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_system_config_key` UNIQUE(`config_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_system_config_status` ON `sys_system_config` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sys_system_config_value_type` ON `sys_system_config` (`value_type`);