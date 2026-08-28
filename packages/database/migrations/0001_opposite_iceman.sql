CREATE TABLE `sys_role_menu` (
	`role_id` bigint unsigned NOT NULL,
	`menu_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_role_menu_role_id_menu_id_pk` PRIMARY KEY(`role_id`,`menu_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_role_permission` (
	`role_id` bigint unsigned NOT NULL,
	`permission_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_role_permission_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_user_role` (
	`user_id` bigint unsigned NOT NULL,
	`role_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_user_role_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_menu` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`name` varchar(64) NOT NULL,
	`type` enum('directory','menu','external') NOT NULL DEFAULT 'menu',
	`path` varchar(255),
	`component` varchar(255),
	`icon` varchar(64),
	`sort` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`keep_alive` boolean NOT NULL DEFAULT false,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_menu_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sys_permission` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(128) NOT NULL,
	`name` varchar(64) NOT NULL,
	`module` varchar(64),
	`description` varchar(255),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_permission_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_permission_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sys_role` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(64) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`data_scope` enum('all','dept','dept_and_below','self','custom') NOT NULL DEFAULT 'self',
	`is_system` boolean NOT NULL DEFAULT false,
	`remark` varchar(255),
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_role_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_role_code` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `sys_user` ADD `created_by` bigint unsigned;--> statement-breakpoint
ALTER TABLE `sys_user` ADD `updated_by` bigint unsigned;--> statement-breakpoint
ALTER TABLE `sys_user` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `sys_role_menu_role_id_sys_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `sys_role_menu_menu_id_sys_menu_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_role_permission` ADD CONSTRAINT `sys_role_permission_role_id_sys_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_role_permission` ADD CONSTRAINT `sys_role_permission_permission_id_sys_permission_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `sys_permission`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_role` ADD CONSTRAINT `sys_user_role_user_id_sys_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_role` ADD CONSTRAINT `sys_user_role_role_id_sys_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_role_menu_menu_id` ON `sys_role_menu` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_role_permission_permission_id` ON `sys_role_permission` (`permission_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_user_role_role_id` ON `sys_user_role` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_menu_parent_id` ON `sys_menu` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_menu_status` ON `sys_menu` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sys_permission_module` ON `sys_permission` (`module`);--> statement-breakpoint
CREATE INDEX `idx_sys_role_status` ON `sys_role` (`status`);