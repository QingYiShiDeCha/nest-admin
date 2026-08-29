/**
 * 侧边栏图标注册表：sys_menu.icon 存的是这里的键名（Remix Icon 的
 * PascalCase 组件名），值是 UnoCSS presetIcons 的图标 class。
 *
 * 这个文件必须保持零依赖：uno.config.ts 会 import 它生成 safelist——
 * presetIcons 是编译期扫描 class 名生成 CSS，菜单图标是运行时从
 * 数据库拼出来的，不进 safelist 就不会被生成，页面上只剩一个空位。
 *
 * 刻意不用 import * 再按名索引的老组件方案，也不在页面里 import
 * 图标组件：图标变成纯 class 后，加图标只需要在这里补一行 +
 * pnpm add 对应的 @iconify-json 集合。
 *
 * 图片 URL 原样透传给 AppIcon；没登记的图标名被当成「没有图标」渲染：
 * 图标是装饰，不该因为数据库里写错一个名字就打不开后台。
 */
export const MENU_ICONS = {
  RiDashboardLine: 'i-ri:dashboard-line',
  RiSettings3Line: 'i-ri:settings-3-line',
  RiUser3Line: 'i-ri:user-3-line',
  RiTeamLine: 'i-ri:team-line',
  RiMenu2Line: 'i-ri:menu-2-line',
  RiFileList3Line: 'i-ri:file-list-3-line',
  RiIdCardLine: 'i-ri:id-card-line',
} as const satisfies Readonly<Record<string, string>>;

const LEGACY_MENU_ICON_NAMES: Readonly<
  Record<string, keyof typeof MENU_ICONS>
> = {
  DashboardOutlined: 'RiDashboardLine',
  SettingOutlined: 'RiSettings3Line',
  UserOutlined: 'RiUser3Line',
  TeamOutlined: 'RiTeamLine',
  MenuOutlined: 'RiMenu2Line',
  FileTextOutlined: 'RiFileList3Line',
  IdcardOutlined: 'RiIdCardLine',
};

const IMAGE_ICON_PATTERN =
  /^(?:https?:\/\/|data:image\/|blob:|\/.*\.(?:png|jpe?g|gif|svg|webp|ico)(?:[?#].*)?$)/i;

export function resolveMenuIcon(name: string | null): string | undefined {
  if (!name) {
    return undefined;
  }

  if (IMAGE_ICON_PATTERN.test(name)) {
    return name;
  }

  const normalizedName = LEGACY_MENU_ICON_NAMES[name] ?? name;
  const iconClass = (MENU_ICONS as Readonly<Record<string, string>>)[
    normalizedName
  ];

  if (!iconClass && import.meta.env.DEV) {
    console.warn(`[menu] 未登记的图标名 "${name}"，请在 menu-icons.ts 补充`);
  }

  return iconClass;
}
