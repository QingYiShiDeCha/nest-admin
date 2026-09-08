ALTER TABLE `sys_user` ADD `password_changed_at` timestamp;
--> statement-breakpoint
-- 存量用户回填为迁移时刻：视为密码刚设置，避免上线瞬间全员被强制改密。
-- seed 初始密码（admin）由 seed 脚本按默认密码哈希比对后单独置 null，要求首次登录改密。
UPDATE `sys_user` SET `password_changed_at` = NOW();
