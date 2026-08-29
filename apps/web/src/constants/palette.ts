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

export const SEMANTIC_COLORS = {
  success: '#13DEB9',
  warning: '#FFAE1F',
  /** 危险：破坏性操作，注入 token.colorError */
  danger: '#FF4D4F',
  /** 错误：状态展示用的软红，antd 无对应全局通道，按需手动使用 */
  error: '#FA896B',
  info: '#38C0FC',
} as const;
