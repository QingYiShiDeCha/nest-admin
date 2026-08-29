/**
 * 侧边栏图标注册表：sys_menu.icon 存的是这里的键名（antd 风格的
 * PascalCase 名，与库里已有数据保持一致），值是 UnoCSS presetIcons
 * 的图标 class（ant-design 集合，kebab-case）。
 *
 * 这个文件必须保持零依赖：uno.config.ts 会 import 它生成 safelist——
 * presetIcons 是编译期扫描 class 名生成 CSS，菜单图标是运行时从
 * 数据库拼出来的，不进 safelist 就不会被生成，页面上只剩一个空位。
 *
 * 刻意不用 import * 再按名索引的老组件方案，也不在页面里 import
 * 图标组件：图标变成纯 class 后，加图标只需要在这里补一行 +
 * pnpm add 对应的 @iconify-json 集合。
 *
 * 没登记的名字被当成「没有图标」渲染，不会让菜单崩掉：
 * 图标是装饰，不该因为数据库里写错一个名字就打不开后台。
 */
export const MENU_ICONS: Readonly<Record<string, string>> = {
  DashboardOutlined: 'i-ant-design:dashboard-outlined',
  SettingOutlined: 'i-ant-design:setting-outlined',
  UserOutlined: 'i-ant-design:user-outlined',
  TeamOutlined: 'i-ant-design:team-outlined',
  MenuOutlined: 'i-ant-design:menu-outlined',
  FileTextOutlined: 'i-ant-design:file-text-outlined',
  IdcardOutlined: 'i-ant-design:idcard-outlined',
};

export function resolveMenuIcon(name: string | null): string | undefined {
  if (!name) {
    return undefined;
  }

  const iconClass = MENU_ICONS[name];

  if (!iconClass && import.meta.env.DEV) {
    console.warn(`[menu] 未登记的图标名 "${name}"，请在 menu-icons.ts 补充`);
  }

  return iconClass;
}
