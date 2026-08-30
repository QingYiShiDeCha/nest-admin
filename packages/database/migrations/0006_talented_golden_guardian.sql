ALTER TABLE `sys_dept` ADD `leader_id` bigint unsigned;--> statement-breakpoint
UPDATE `sys_dept` AS `department`
INNER JOIN `sys_user` AS `matched_leader`
	ON `matched_leader`.`deleted_at` IS NULL
	AND `matched_leader`.`status` = 'active'
	AND (`matched_leader`.`username` = `department`.`leader` OR `matched_leader`.`nickname` = `department`.`leader`)
LEFT JOIN `sys_user` AS `duplicate_leader`
	ON `duplicate_leader`.`deleted_at` IS NULL
	AND `duplicate_leader`.`status` = 'active'
	AND `duplicate_leader`.`id` <> `matched_leader`.`id`
	AND (`duplicate_leader`.`username` = `department`.`leader` OR `duplicate_leader`.`nickname` = `department`.`leader`)
SET `department`.`leader_id` = `matched_leader`.`id`
WHERE `department`.`leader` IS NOT NULL
	AND `duplicate_leader`.`id` IS NULL;--> statement-breakpoint
ALTER TABLE `sys_dept` ADD CONSTRAINT `sys_dept_leader_id_sys_user_id_fk` FOREIGN KEY (`leader_id`) REFERENCES `sys_user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sys_dept_leader_id` ON `sys_dept` (`leader_id`);--> statement-breakpoint
ALTER TABLE `sys_dept` DROP COLUMN `leader`;
