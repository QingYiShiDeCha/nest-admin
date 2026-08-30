/**
 * 菜单图标的精选清单。sys_menu.icon 存 value，侧边栏渲染 icon class。
 * UnoCSS 也直接读取该清单生成 safelist，因此只会产出这些常用图标，
 * 不会把整套 Remix Icon 加进应用样式。
 */
export interface MenuIconOption {
  value: string;
  icon: string;
  label: string;
  keywords?: string;
}

export const MENU_ICON_OPTIONS = [
  {
    value: 'RiDashboardLine',
    icon: 'i-ri:dashboard-line',
    label: '仪表盘',
    keywords: 'dashboard workbench',
  },
  {
    value: 'RiHome2Line',
    icon: 'i-ri:home-2-line',
    label: '首页',
    keywords: 'home',
  },
  {
    value: 'RiApps2Line',
    icon: 'i-ri:apps-2-line',
    label: '应用',
    keywords: 'apps module',
  },
  {
    value: 'RiSettings3Line',
    icon: 'i-ri:settings-3-line',
    label: '设置',
    keywords: 'setting config',
  },
  {
    value: 'RiToolsLine',
    icon: 'i-ri:tools-line',
    label: '工具',
    keywords: 'tools',
  },
  {
    value: 'RiUser3Line',
    icon: 'i-ri:user-3-line',
    label: '用户',
    keywords: 'user account',
  },
  {
    value: 'RiUserSettingsLine',
    icon: 'i-ri:user-settings-line',
    label: '用户设置',
    keywords: 'user setting account',
  },
  {
    value: 'RiTeamLine',
    icon: 'i-ri:team-line',
    label: '团队',
    keywords: 'team users',
  },
  {
    value: 'RiAdminLine',
    icon: 'i-ri:admin-line',
    label: '管理员',
    keywords: 'admin manager',
  },
  {
    value: 'RiShieldUserLine',
    icon: 'i-ri:shield-user-line',
    label: '权限用户',
    keywords: 'permission role security',
  },
  {
    value: 'RiMenu2Line',
    icon: 'i-ri:menu-2-line',
    label: '菜单',
    keywords: 'menu navigation',
  },
  {
    value: 'RiListCheck3',
    icon: 'i-ri:list-check-3',
    label: '清单',
    keywords: 'list check',
  },
  {
    value: 'RiFileList3Line',
    icon: 'i-ri:file-list-3-line',
    label: '列表',
    keywords: 'file list log',
  },
  {
    value: 'RiFileTextLine',
    icon: 'i-ri:file-text-line',
    label: '文档',
    keywords: 'file text document',
  },
  {
    value: 'RiFolder2Line',
    icon: 'i-ri:folder-2-line',
    label: '目录',
    keywords: 'folder directory',
  },
  {
    value: 'RiFolderOpenLine',
    icon: 'i-ri:folder-open-line',
    label: '打开目录',
    keywords: 'folder open',
  },
  {
    value: 'RiIdCardLine',
    icon: 'i-ri:id-card-line',
    label: '身份卡',
    keywords: 'id card identity',
  },
  {
    value: 'RiProfileLine',
    icon: 'i-ri:profile-line',
    label: '档案',
    keywords: 'profile resume',
  },
  {
    value: 'RiLockLine',
    icon: 'i-ri:lock-line',
    label: '锁定',
    keywords: 'lock security',
  },
  {
    value: 'RiKey2Line',
    icon: 'i-ri:key-2-line',
    label: '密钥',
    keywords: 'key permission',
  },
  {
    value: 'RiDatabase2Line',
    icon: 'i-ri:database-2-line',
    label: '数据库',
    keywords: 'database data',
  },
  {
    value: 'RiServerLine',
    icon: 'i-ri:server-line',
    label: '服务器',
    keywords: 'server api',
  },
  {
    value: 'RiCloudLine',
    icon: 'i-ri:cloud-line',
    label: '云服务',
    keywords: 'cloud',
  },
  {
    value: 'RiHardDrive3Line',
    icon: 'i-ri:hard-drive-3-line',
    label: '存储',
    keywords: 'storage disk',
  },
  {
    value: 'RiBarChartBoxLine',
    icon: 'i-ri:bar-chart-box-line',
    label: '柱状图',
    keywords: 'bar chart analytics',
  },
  {
    value: 'RiPieChart2Line',
    icon: 'i-ri:pie-chart-2-line',
    label: '饼图',
    keywords: 'pie chart analytics',
  },
  {
    value: 'RiLineChartLine',
    icon: 'i-ri:line-chart-line',
    label: '趋势图',
    keywords: 'line chart trend',
  },
  {
    value: 'RiDonutChartLine',
    icon: 'i-ri:donut-chart-line',
    label: '环形图',
    keywords: 'donut chart',
  },
  {
    value: 'RiTable2',
    icon: 'i-ri:table-2',
    label: '表格',
    keywords: 'table grid',
  },
  {
    value: 'RiCalendar2Line',
    icon: 'i-ri:calendar-2-line',
    label: '日历',
    keywords: 'calendar date',
  },
  {
    value: 'RiTimeLine',
    icon: 'i-ri:time-line',
    label: '时间',
    keywords: 'time clock',
  },
  {
    value: 'RiNotification3Line',
    icon: 'i-ri:notification-3-line',
    label: '通知',
    keywords: 'notification bell',
  },
  {
    value: 'RiMessage3Line',
    icon: 'i-ri:message-3-line',
    label: '消息',
    keywords: 'message chat',
  },
  {
    value: 'RiMailLine',
    icon: 'i-ri:mail-line',
    label: '邮件',
    keywords: 'mail email',
  },
  {
    value: 'RiSearch2Line',
    icon: 'i-ri:search-2-line',
    label: '搜索',
    keywords: 'search query',
  },
  {
    value: 'RiAddCircleLine',
    icon: 'i-ri:add-circle-line',
    label: '新增',
    keywords: 'add plus create',
  },
  {
    value: 'RiEdit2Line',
    icon: 'i-ri:edit-2-line',
    label: '编辑',
    keywords: 'edit pencil',
  },
  {
    value: 'RiDeleteBinLine',
    icon: 'i-ri:delete-bin-line',
    label: '删除',
    keywords: 'delete remove trash',
  },
  {
    value: 'RiEyeLine',
    icon: 'i-ri:eye-line',
    label: '查看',
    keywords: 'eye view visible',
  },
  {
    value: 'RiEyeOffLine',
    icon: 'i-ri:eye-off-line',
    label: '隐藏',
    keywords: 'eye hidden invisible',
  },
  {
    value: 'RiDownload2Line',
    icon: 'i-ri:download-2-line',
    label: '下载',
    keywords: 'download export',
  },
  {
    value: 'RiUpload2Line',
    icon: 'i-ri:upload-2-line',
    label: '上传',
    keywords: 'upload import',
  },
  {
    value: 'RiRefreshLine',
    icon: 'i-ri:refresh-line',
    label: '刷新',
    keywords: 'refresh reload',
  },
  { value: 'RiLink', icon: 'i-ri:link', label: '链接', keywords: 'link url' },
  {
    value: 'RiExternalLinkLine',
    icon: 'i-ri:external-link-line',
    label: '外部链接',
    keywords: 'external link url',
  },
  {
    value: 'RiRouteLine',
    icon: 'i-ri:route-line',
    label: '路由',
    keywords: 'route navigation',
  },
  {
    value: 'RiGlobalLine',
    icon: 'i-ri:global-line',
    label: '全球',
    keywords: 'global world',
  },
  {
    value: 'RiMapPinLine',
    icon: 'i-ri:map-pin-line',
    label: '定位',
    keywords: 'map location pin',
  },
  {
    value: 'RiCustomerService2Line',
    icon: 'i-ri:customer-service-2-line',
    label: '客服',
    keywords: 'customer service support',
  },
  {
    value: 'RiShoppingCart2Line',
    icon: 'i-ri:shopping-cart-2-line',
    label: '购物车',
    keywords: 'shopping cart ecommerce',
  },
  {
    value: 'RiStore2Line',
    icon: 'i-ri:store-2-line',
    label: '门店',
    keywords: 'store shop ecommerce',
  },
  {
    value: 'RiBankCardLine',
    icon: 'i-ri:bank-card-line',
    label: '银行卡',
    keywords: 'bank card payment',
  },
  {
    value: 'RiMoneyCnyCircleLine',
    icon: 'i-ri:money-cny-circle-line',
    label: '金额',
    keywords: 'money cny finance',
  },
  {
    value: 'RiCoupon3Line',
    icon: 'i-ri:coupon-3-line',
    label: '优惠券',
    keywords: 'coupon ticket ecommerce',
  },
  {
    value: 'RiArticleLine',
    icon: 'i-ri:article-line',
    label: '文章',
    keywords: 'article content',
  },
  {
    value: 'RiImage2Line',
    icon: 'i-ri:image-2-line',
    label: '图片',
    keywords: 'image photo media',
  },
  {
    value: 'RiVideoLine',
    icon: 'i-ri:video-line',
    label: '视频',
    keywords: 'video media',
  },
  {
    value: 'RiCodeBoxLine',
    icon: 'i-ri:code-box-line',
    label: '开发',
    keywords: 'code develop',
  },
  {
    value: 'RiTerminalBoxLine',
    icon: 'i-ri:terminal-box-line',
    label: '终端',
    keywords: 'terminal command',
  },
  {
    value: 'RiBugLine',
    icon: 'i-ri:bug-line',
    label: '缺陷',
    keywords: 'bug issue',
  },
  {
    value: 'RiFileChartLine',
    icon: 'i-ri:file-chart-line',
    label: '报表',
    keywords: 'file chart report',
  },
  {
    value: 'RiTaskLine',
    icon: 'i-ri:task-line',
    label: '任务',
    keywords: 'task todo',
  },
] as const satisfies readonly MenuIconOption[];

export type MenuIconName = (typeof MENU_ICON_OPTIONS)[number]['value'];

export const MENU_ICONS = Object.fromEntries(
  MENU_ICON_OPTIONS.map((item) => [item.value, item.icon]),
) as Readonly<Record<MenuIconName, string>>;

const LEGACY_MENU_ICON_NAMES: Readonly<Record<string, MenuIconName>> = {
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
  if (!name) return undefined;
  if (IMAGE_ICON_PATTERN.test(name)) return name;

  const normalizedName = LEGACY_MENU_ICON_NAMES[name] ?? name;
  const iconClass = (MENU_ICONS as Readonly<Record<string, string>>)[
    normalizedName
  ];

  if (!iconClass && import.meta.env.DEV) {
    console.warn(`[menu] 未登记的图标名 "${name}"，请在 menu-icons.ts 补充`);
  }

  return iconClass;
}
