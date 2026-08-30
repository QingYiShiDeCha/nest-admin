export const NOTICE_TYPE = ['notice', 'announcement'] as const;
export type NoticeType = (typeof NOTICE_TYPE)[number];

export const NOTICE_PRIORITY = ['normal', 'important', 'urgent'] as const;
export type NoticePriority = (typeof NOTICE_PRIORITY)[number];

export const NOTICE_STATUS = ['draft', 'published', 'withdrawn'] as const;
export type NoticeStatus = (typeof NOTICE_STATUS)[number];

export const NOTICE_TARGET_TYPE = [
  'all',
  'department',
  'role',
  'user',
] as const;
export type NoticeTargetType = (typeof NOTICE_TARGET_TYPE)[number];

export const NOTICE_REALTIME_EVENT = [
  'message.created',
  'message.withdrawn',
  'message.read',
  'message.read-all',
] as const;
export type NoticeRealtimeEventType = (typeof NOTICE_REALTIME_EVENT)[number];
