import type { DATA_SCOPE, MENU_TYPE, STATUS } from '@nest-admin/shared';

import { SEMANTIC_COLORS } from '@/constants/palette';
import type { ThemeTone } from '@/constants/palette';

export type Status = (typeof STATUS)[number];
export type MenuType = (typeof MENU_TYPE)[number];
export type DataScope = (typeof DATA_SCOPE)[number];

interface Option<T> {
  label: string;
  value: T;
}

/** 状态 → 展示文案与标签色，用户/角色/菜单三处共用 */
// Tag 的 color 用状态预设而不是具体色值，让它们跟随全局语义色 token
export const STATUS_META: Record<Status, { label: string; color: ThemeTone }> =
  {
    active: { label: '启用', color: 'success' },
    disabled: { label: '禁用', color: 'error' },
  };

export const STATUS_OPTIONS: Option<Status>[] = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' },
];

export const MENU_TYPE_META: Record<
  MenuType,
  { label: string; color: ThemeTone }
> = {
  directory: { label: '目录', color: 'primary' },
  menu: { label: '菜单', color: 'success' },
  external: { label: '外链', color: 'info' },
};

export const MENU_TYPE_OPTIONS: Option<MenuType>[] = [
  { label: '目录', value: 'directory' },
  { label: '菜单', value: 'menu' },
  { label: '外链', value: 'external' },
];

export const DATA_SCOPE_META: Record<DataScope, string> = {
  all: '全部数据',
  dept: '本部门',
  dept_and_below: '本部门及下级',
  self: '仅本人',
  custom: '自定义',
};

export const DATA_SCOPE_OPTIONS: Option<DataScope>[] = (
  Object.keys(DATA_SCOPE_META) as DataScope[]
).map((value) => ({ label: DATA_SCOPE_META[value], value }));

export const OPERATION_STATUS_META: Record<
  'success' | 'failure',
  { label: string; color: string }
> = {
  // 失败用调色板里的「错误」软红：antd 只有一条 error 通道（给了危险色），
  // 日志失败态是展示不是破坏性操作，用软红区分开
  success: { label: '成功', color: 'success' },
  failure: { label: '失败', color: SEMANTIC_COLORS.error },
};
