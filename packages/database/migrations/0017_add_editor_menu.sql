-- 添加富文本编辑器菜单项
SET NAMES utf8mb4;
INSERT INTO `sys_menu` (`name`, `path`, `icon`, `type`, `sort`, `status`, `parent_id`, `component`, `created_at`, `updated_at`)
VALUES ('富文本编辑器', '/editor', 'RiEditLine', 'menu', 999, 'active', NULL, NULL, NOW(), NOW());

-- 为超级管理员角色授权（假设角色 ID 为 1）
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, `id` FROM `sys_menu` WHERE `path` = '/editor' AND `deleted_at` IS NULL;
