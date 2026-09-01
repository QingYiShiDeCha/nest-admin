/**
 * 全站调色板，单一来源。
 *
 * 品牌色是可选主色（顶栏切换器在七者之间切换），经 ConfigProvider 的
 * colorPrimary 注入 antdv 的 design token——梯度色板、hover/active 态
 * 由派生算法自动生成，不要手写这些衍生色。
 *
 * 语义色的映射有个约束要知道：antd 的 token 里错误只有一条通道
 * （colorError），「危险」和「错误」无法同时全局生效。取舍是——
 * colorError 给「危险」（饱和红，破坏性操作：删除按钮、Popconfirm），
 * 「错误」的软红留给需要区分场景的地方手动使用（如日志失败标签）。
 */
export interface BrandColor {
  name: string;
  value: string;
}

export type ThemeTone =
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export const BRAND_COLORS: readonly BrandColor[] = [
  { name: '默认蓝', value: '#5D87FF' },
  { name: '淡紫色', value: '#B48DF3' },
  { name: '亮蓝色', value: '#1D84FF' },
  { name: '绿色', value: '#60C041' },
  { name: '天蓝色', value: '#38C0FC' },
  { name: '橙色', value: '#F9901F' },
  { name: '粉色', value: '#FF80C8' },
];

export const DEFAULT_PRIMARY = '#5D87FF';

export const GRAY_COLORS = {
  100: '#F9FAFB',
  200: '#F2F4F5',
  300: '#E6EAEB',
  400: '#DBDFE1',
  500: '#949EB7',
  600: '#7987A1',
  700: '#4D5875',
  800: '#383853',
  900: '#323251',
} as const;

export const DARK_GRAY_COLORS = {
  100: '#110F0F',
  200: '#17171C',
  300: '#393946',
  400: '#505062',
  500: '#73738C',
  600: '#8F8FA3',
  700: '#ABABBA',
  800: '#C7C7D1',
  900: '#E3E3E8',
} as const;

export const LIGHT_THEME_COLORS = {
  foreground: {
    default: 'color-mix(in srgb, #323251 62%, #ffffff)',
  },
  background: {
    layout: '#FAFBFC',
    container: '#FFFFFF',
    level1: GRAY_COLORS[100],
    level2: GRAY_COLORS[200],
    hover: '#EDEFF0',
    active: GRAY_COLORS[200],
  },
  border: {
    default: '#E2E8EE',
    dashed: '#DBDFE9',
    card: 'rgba(0, 0, 0, 0.08)',
    previewDivider: '#EDEEF0',
  },
  menu: {
    background: '#FFFFFF',
    text: '#29343D',
    icon: '#6B6B6B',
    systemName: GRAY_COLORS[800],
  },
} as const;

export const DARK_THEME_COLORS = {
  background: {
    layout: '#070707',
    container: '#161618',
    level1: DARK_GRAY_COLORS[100],
    level2: DARK_GRAY_COLORS[200],
    hover: '#252530',
    active: '#202226',
    elementActive: '#2E2E38',
    base: '#000000',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    card: 'rgba(255, 255, 255, 0.08)',
    dashed: '#363843',
  },
  menu: {
    background: '#161618',
    systemName: '#DDDDDD',
    icon: '#BABBBD',
    text: 'rgba(255, 255, 255, 0.7)',
  },
  traditionalMenu: {
    background: '#191A23',
    systemName: '#D9DADB',
    icon: '#BABBBD',
    text: '#BABBBD',
  },
  editor: {
    toolbarBackground: '#18191C',
    contentBackground: '#090909',
    toolbarActiveBackground: '#25262B',
    text: 'rgba(255, 255, 255, 0.85)',
  },
} as const;

export const SEMANTIC_COLORS = {
  success: '#13DEB9',
  warning: '#FFAE1F',
  /** 危险：破坏性操作，注入 token.colorError */
  danger: '#FF4D4F',
  /** 错误：状态展示用的软红，antd 无对应全局通道，按需手动使用 */
  error: '#FA896B',
  info: '#38C0FC',
} as const;

export function mixColor(
  color: string,
  percentage: number,
  background: string,
): string {
  return `color-mix(in srgb, ${color} ${percentage}%, ${background})`;
}

export const STATUS_SURFACE_COLORS = {
  light: {
    success: mixColor(
      SEMANTIC_COLORS.success,
      12,
      LIGHT_THEME_COLORS.background.container,
    ),
    warning: mixColor(
      SEMANTIC_COLORS.warning,
      12,
      LIGHT_THEME_COLORS.background.container,
    ),
    error: mixColor(
      SEMANTIC_COLORS.danger,
      10,
      LIGHT_THEME_COLORS.background.container,
    ),
    info: mixColor(
      SEMANTIC_COLORS.info,
      12,
      LIGHT_THEME_COLORS.background.container,
    ),
  },
  dark: {
    success: mixColor(
      SEMANTIC_COLORS.success,
      18,
      DARK_THEME_COLORS.background.container,
    ),
    warning: mixColor(
      SEMANTIC_COLORS.warning,
      18,
      DARK_THEME_COLORS.background.container,
    ),
    error: mixColor(
      SEMANTIC_COLORS.danger,
      18,
      DARK_THEME_COLORS.background.container,
    ),
    info: mixColor(
      SEMANTIC_COLORS.info,
      18,
      DARK_THEME_COLORS.background.container,
    ),
  },
} as const;
