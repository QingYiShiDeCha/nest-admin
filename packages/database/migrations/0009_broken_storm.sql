CREATE TABLE `sys_notice_recipient` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`notice_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_notice_recipient_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sys_notice_recipient_notice_user` UNIQUE(`notice_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_notice_target` (
	`notice_id` bigint unsigned NOT NULL,
	`target_type` enum('all','department','role','user') NOT NULL,
	`target_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_notice_target_notice_id_target_type_target_id_pk` PRIMARY KEY(`notice_id`,`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_notice` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(128) NOT NULL,
	`content` text NOT NULL,
	`type` enum('notice','announcement') NOT NULL DEFAULT 'notice',
	`priority` enum('normal','important','urgent') NOT NULL DEFAULT 'normal',
	`target_type` enum('all','department','role','user') NOT NULL,
	`status` enum('draft','published','withdrawn') NOT NULL DEFAULT 'draft',
	`publisher_name` varchar(64),
	`published_at` timestamp,
	`withdrawn_at` timestamp,
	`expires_at` timestamp,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sys_notice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sys_notice_recipient` ADD CONSTRAINT `sys_notice_recipient_notice_id_sys_notice_id_fk` FOREIGN KEY (`notice_id`) REFERENCES `sys_notice`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_notice_recipient` ADD CONSTRAINT `sys_notice_recipient_user_id_sys_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_notice_target` ADD CONSTRAINT `sys_notice_target_notice_id_sys_notice_id_fk` FOREIGN KEY (`notice_id`) REFERENCES `sys_notice`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_notice_recipient_user_read` ON `sys_notice_recipient` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `idx_sys_notice_recipient_notice` ON `sys_notice_recipient` (`notice_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_notice_target_lookup` ON `sys_notice_target` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_sys_notice_status_published` ON `sys_notice` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_sys_notice_created_by` ON `sys_notice` (`created_by`);