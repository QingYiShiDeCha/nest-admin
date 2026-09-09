-- 添加富文本编辑器菜单项
INSERT INTO menus (name, path, icon, sort, parent_id, created_at, updated_at)
VALUES ('富文本编辑器', '/editor', 'RiEditLine', 999, NULL, NOW(), NOW());

-- 如果需要授予管理员权限，执行以下语句（假设管理员角色 ID 为 1）
INSERT INTO role_menus (role_id, menu_id)
SELECT 1, id FROM menus WHERE path = '/editor';
