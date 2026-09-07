ALTER TABLE `sys_login_log` MODIFY COLUMN `status` enum('success','failure','locked') NOT NULL;--> statement-breakpoint
ALTER TABLE `sys_user` ADD `locked_until` timestamp;--> statement-breakpoint
CREATE INDEX `idx_sys_user_locked_until` ON `sys_user` (`locked_until`);