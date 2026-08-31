CREATE TABLE `sys_dict_item` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`type_id` bigint unsigned NOT NULL,
	`label` varchar(64) NOT NULL,
	`value` varchar(128) NOT NULL,
	`tone` enum('default','primary','success','warning','error','info'),
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(255),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_dict_item_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_dict_item_type_value` UNIQUE(`type_id`,`value`)
);
--> statement-breakpoint
CREATE TABLE `sys_dict_type` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(255),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_dict_type_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_dict_type_code` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `sys_dict_item` ADD CONSTRAINT `sys_dict_item_type_id_sys_dict_type_id_fk` FOREIGN KEY (`type_id`) REFERENCES `sys_dict_type`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_dict_item_type_status_sort` ON `sys_dict_item` (`type_id`,`status`,`sort`);--> statement-breakpoint
CREATE INDEX `idx_sys_dict_type_status` ON `sys_dict_type` (`status`);