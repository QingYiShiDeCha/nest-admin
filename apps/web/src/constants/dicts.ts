import type {
  DATA_SCOPE,
  MENU_TYPE,
  NOTICE_PRIORITY,
  NOTICE_STATUS,
  NOTICE_TARGET_TYPE,
  NOTICE_TYPE,
  STATUS,
  SYSTEM_CONFIG_VALUE_TYPE,
  DictionaryTone,
  FileCategory,
  FileStorageDriver,
  LoginStatus,
  ScheduledTaskExecutionStatus,
  ScheduledTaskTriggerType,
} from '@nest-admin/shared';

import { SEMANTIC_COLORS } from '@/constants/palette';
import type { ThemeTone } from '@/constants/palette';

export type Status = (typeof STATUS)[number];
export type MenuType = (typeof MENU_TYPE)[number];
export type DataScope = (typeof DATA_SCOPE)[number];
export type NoticeType = (typeof NOTICE_TYPE)[number];
export type NoticePriority = (typeof NOTICE_PRIORITY)[number];
export type NoticeStatus = (typeof NOTICE_STATUS)[number];
export type NoticeTargetType = (typeof NOTICE_TARGET_TYPE)[number];
export type SystemConfigValueType = (typeof SYSTEM_CONFIG_VALUE_TYPE)[number];

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

export const SYSTEM_CONFIG_VALUE_TYPE_META: Record<
  SystemConfigValueType,
  { label: string; tone: ThemeTone }
> = {
  string: { label: '文本', tone: 'default' },
  number: { label: '数字', tone: 'primary' },
  boolean: { label: '布尔', tone: 'success' },
  json: { label: 'JSON', tone: 'warning' },
};

export const SYSTEM_CONFIG_VALUE_TYPE_OPTIONS = Object.entries(
  SYSTEM_CONFIG_VALUE_TYPE_META,
).map(([value, meta]) => ({
  value: value as SystemConfigValueType,
  label: meta.label,
}));

export const DICTIONARY_TONE_OPTIONS: Option<DictionaryTone>[] = [
  { label: '默认', value: 'default' },
  { label: '主色', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'error' },
  { label: '信息', value: 'info' },
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

export const LOGIN_STATUS_META: Record<
  LoginStatus,
  { label: string; tone: ThemeTone }
> = {
  success: { label: '成功', tone: 'success' },
  failure: { label: '失败', tone: 'error' },
};

export const FILE_CATEGORY_META: Record<
  FileCategory,
  { label: string; tone: ThemeTone }
> = {
  image: { label: '图片', tone: 'primary' },
  video: { label: '视频', tone: 'info' },
  audio: { label: '音频', tone: 'success' },
  document: { label: '文档', tone: 'warning' },
  archive: { label: '压缩包', tone: 'error' },
  other: { label: '其他', tone: 'default' },
};

export const FILE_CATEGORY_OPTIONS = Object.entries(FILE_CATEGORY_META).map(
  ([value, meta]) => ({
    value: value as FileCategory,
    label: meta.label,
  }),
);

export const FILE_STORAGE_META: Record<
  FileStorageDriver,
  { label: string; tone: ThemeTone }
> = {
  local: { label: '本地', tone: 'default' },
  s3: { label: 'S3', tone: 'primary' },
};

export const FILE_STORAGE_OPTIONS = Object.entries(FILE_STORAGE_META).map(
  ([value, meta]) => ({
    value: value as FileStorageDriver,
    label: meta.label,
  }),
);

export const SCHEDULED_TASK_EXECUTION_STATUS_META: Record<
  ScheduledTaskExecutionStatus,
  { label: string; tone: ThemeTone }
> = {
  running: { label: '执行中', tone: 'info' },
  success: { label: '成功', tone: 'success' },
  failure: { label: '失败', tone: 'error' },
  skipped: { label: '已跳过', tone: 'warning' },
};

export const SCHEDULED_TASK_EXECUTION_STATUS_OPTIONS = Object.entries(
  SCHEDULED_TASK_EXECUTION_STATUS_META,
).map(([value, meta]) => ({
  value: value as ScheduledTaskExecutionStatus,
  label: meta.label,
}));

export const SCHEDULED_TASK_TRIGGER_TYPE_META: Record<
  ScheduledTaskTriggerType,
  { label: string; tone: ThemeTone }
> = {
  scheduled: { label: '定时', tone: 'primary' },
  manual: { label: '手动', tone: 'default' },
};

export const SCHEDULED_TASK_TRIGGER_TYPE_OPTIONS = Object.entries(
  SCHEDULED_TASK_TRIGGER_TYPE_META,
).map(([value, meta]) => ({
  value: value as ScheduledTaskTriggerType,
  label: meta.label,
}));

export const NOTICE_TYPE_META: Record<
  NoticeType,
  { label: string; tone: ThemeTone }
> = {
  notice: { label: '通知', tone: 'info' },
  announcement: { label: '公告', tone: 'primary' },
};

export const NOTICE_PRIORITY_META: Record<
  NoticePriority,
  { label: string; tone: ThemeTone }
> = {
  normal: { label: '普通', tone: 'default' },
  important: { label: '重要', tone: 'warning' },
  urgent: { label: '紧急', tone: 'error' },
};

export const NOTICE_STATUS_META: Record<
  NoticeStatus,
  { label: string; tone: ThemeTone }
> = {
  draft: { label: '草稿', tone: 'default' },
  published: { label: '已发布', tone: 'success' },
  withdrawn: { label: '已撤回', tone: 'warning' },
};

export const NOTICE_TARGET_META: Record<NoticeTargetType, string> = {
  all: '全员',
  department: '按部门',
  role: '按角色',
  user: '指定用户',
};

export const NOTICE_TYPE_OPTIONS = Object.entries(NOTICE_TYPE_META).map(
  ([value, meta]) => ({ value: value as NoticeType, label: meta.label }),
);
export const NOTICE_PRIORITY_OPTIONS = Object.entries(NOTICE_PRIORITY_META).map(
  ([value, meta]) => ({
    value: value as NoticePriority,
    label: meta.label,
  }),
);
export const NOTICE_STATUS_OPTIONS = Object.entries(NOTICE_STATUS_META).map(
  ([value, meta]) => ({ value: value as NoticeStatus, label: meta.label }),
);
export const NOTICE_TARGET_OPTIONS = Object.entries(NOTICE_TARGET_META).map(
  ([value, label]) => ({ value: value as NoticeTargetType, label }),
);
