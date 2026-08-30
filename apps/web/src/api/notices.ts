import type {
  NoticeDetail,
  NoticeListItem,
  NoticeMessage,
  NoticePriority,
  NoticeStatus,
  NoticeTargetOption,
  NoticeTargetType,
  NoticeType,
  NoticeUnreadCount,
  PaginatedResult,
} from '@nest-admin/shared';

import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  withQuery,
} from '@/api/http';

export interface NoticeQuery {
  keyword?: string;
  status?: NoticeStatus | '';
  type?: NoticeType | '';
  priority?: NoticePriority | '';
}

export interface NoticePayload {
  title: string;
  content: string;
  type?: NoticeType;
  priority?: NoticePriority;
  targetType: NoticeTargetType;
  targetIds?: number[];
  expiresAt?: string | null;
}

export interface MessageQuery {
  readStatus?: 'all' | 'read' | 'unread';
}

export function apiNoticePage(
  query: NoticeQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<NoticeListItem>> {
  return httpGet(withQuery('/notices', { ...query }));
}

export function apiNoticeDetail(id: number): Promise<NoticeDetail> {
  return httpGet(`/notices/${id}`);
}

export function apiNoticeCreate(
  payload: NoticePayload,
): Promise<NoticeDetail> {
  return httpPost('/notices', payload);
}

export function apiNoticeUpdate(
  id: number,
  payload: Partial<NoticePayload>,
): Promise<NoticeDetail> {
  return httpPatch(`/notices/${id}`, payload);
}

export function apiNoticePublish(id: number): Promise<NoticeDetail> {
  return httpPost(`/notices/${id}/publish`);
}

export function apiNoticeWithdraw(id: number): Promise<NoticeDetail> {
  return httpPost(`/notices/${id}/withdraw`);
}

export function apiNoticeRemove(id: number): Promise<void> {
  return httpDelete(`/notices/${id}`);
}

export function apiNoticeTargetOptions(
  targetType: Exclude<NoticeTargetType, 'all'>,
  keyword?: string,
): Promise<NoticeTargetOption[]> {
  return httpGet(
    withQuery('/notices/target-options', { targetType, keyword }),
  );
}

export function apiMessagePage(
  query: MessageQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<NoticeMessage>> {
  return httpGet(withQuery('/messages', { ...query }));
}

export function apiRecentMessages(): Promise<NoticeMessage[]> {
  return httpGet('/messages/recent');
}

export function apiMessageDetail(id: number): Promise<NoticeMessage> {
  return httpGet(`/messages/${id}`);
}

export function apiMessageUnreadCount(): Promise<NoticeUnreadCount> {
  return httpGet('/messages/unread-count');
}

export function apiMessageRead(id: number): Promise<void> {
  return httpPatch(`/messages/${id}/read`);
}

export function apiMessageReadAll(): Promise<void> {
  return httpPatch('/messages/read-all');
}
