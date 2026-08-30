import type {
  NoticePriority,
  NoticeRealtimeEventType,
  NoticeStatus,
  NoticeTargetType,
  NoticeType,
} from '../constants/notice';

export interface Notice {
  id: number;
  title: string;
  content: string;
  type: NoticeType;
  priority: NoticePriority;
  targetType: NoticeTargetType;
  status: NoticeStatus;
  publisherName: string | null;
  publishedAt: string | null;
  withdrawnAt: string | null;
  expiresAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListItem extends Notice {
  targetCount: number;
  recipientCount: number;
  readCount: number;
}

export interface NoticeTargetOption {
  id: number;
  label: string;
  description: string | null;
}

export interface NoticeDetail extends NoticeListItem {
  targets: NoticeTargetOption[];
}

export interface NoticeMessage {
  id: number;
  noticeId: number;
  title: string;
  content: string;
  type: NoticeType;
  priority: NoticePriority;
  publisherName: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NoticeUnreadCount {
  count: number;
}

/** SSE 只发状态失效信号，消息正文仍以 REST 查询结果为准。 */
export interface NoticeRealtimeEvent {
  id: string;
  type: NoticeRealtimeEventType;
  occurredAt: string;
  noticeId?: number;
  messageId?: number;
}
