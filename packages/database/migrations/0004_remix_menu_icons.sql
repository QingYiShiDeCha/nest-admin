UPDATE `sys_menu`
SET `icon` = CASE `icon`
	WHEN 'DashboardOutlined' THEN 'RiDashboardLine'
	WHEN 'SettingOutlined' THEN 'RiSettings3Line'
	WHEN 'UserOutlined' THEN 'RiUser3Line'
	WHEN 'TeamOutlined' THEN 'RiTeamLine'
	WHEN 'MenuOutlined' THEN 'RiMenu2Line'
	WHEN 'FileTextOutlined' THEN 'RiFileList3Line'
	WHEN 'IdcardOutlined' THEN 'RiIdCardLine'
	ELSE `icon`
END
WHERE `icon` IN (
	'DashboardOutlined',
	'SettingOutlined',
	'UserOutlined',
	'TeamOutlined',
	'MenuOutlined',
	'FileTextOutlined',
	'IdcardOutlined'
);
