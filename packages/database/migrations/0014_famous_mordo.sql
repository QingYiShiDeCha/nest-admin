CREATE TABLE `sys_file_resource` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(128) NOT NULL,
	`extension` varchar(32),
	`category` enum('image','video','audio','document','archive','other') NOT NULL,
	`size` bigint unsigned NOT NULL,
	`storage` enum('local','s3') NOT NULL,
	`uploader_id` bigint unsigned,
	`uploader_username` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `sys_file_resource_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_file_resource_key` UNIQUE(`object_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_sys_file_resource_category` ON `sys_file_resource` (`category`);--> statement-breakpoint
CREATE INDEX `idx_sys_file_resource_storage` ON `sys_file_resource` (`storage`);--> statement-breakpoint
CREATE INDEX `idx_sys_file_resource_uploader_id` ON `sys_file_resource` (`uploader_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_file_resource_created_at` ON `sys_file_resource` (`created_at`);--> statement-breakpoint
INSERT INTO `sys_menu` (
	`parent_id`, `name`, `type`, `path`, `component`, `icon`, `sort`, `visible`, `keep_alive`, `status`
)
SELECT
	`system_menu`.`id`, '文件资源', 'menu', '/system/file-resource',
	'system/file-resource/index', 'RiFolder2Line', 70, true, true, 'active'
FROM `sys_menu` AS `system_menu`
WHERE `system_menu`.`name` = '系统管理'
	AND `system_menu`.`parent_id` IS NULL
	AND `system_menu`.`deleted_at` IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM `sys_menu` AS `existing_file_resource`
		WHERE `existing_file_resource`.`path` = '/system/file-resource'
			AND `existing_file_resource`.`deleted_at` IS NULL
	)
LIMIT 1;
