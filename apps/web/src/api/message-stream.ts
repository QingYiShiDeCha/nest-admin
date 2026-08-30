import {
  EventStreamContentType,
  fetchEventSource,
  type EventSourceMessage,
} from '@microsoft/fetch-event-source';
import {
  NOTICE_REALTIME_EVENT,
  type NoticeRealtimeEvent,
  type NoticeRealtimeEventType,
} from '@nest-admin/shared';

import { emitUnauthorized } from '@/utils/auth-events';
import { API_BASE_URL, refreshAccessToken } from '@/utils/auth-refresh';
import { clearTokens, getAccessToken } from '@/utils/auth-token';

const RETRY_INTERVAL_MS = 3_000;

export interface MessageStreamCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onEvent: (event: NoticeRealtimeEvent) => void;
}

class FatalStreamError extends Error {}

export function subscribeMessageStream(
  callbacks: MessageStreamCallbacks,
): () => void {
  const controller = new AbortController();

  void fetchEventSource(`${API_BASE_URL}/messages/stream`, {
    method: 'GET',
    openWhenHidden: true,
    signal: controller.signal,
    fetch: authenticatedFetch,
    async onopen(response) {
      if (
        response.ok &&
        response.headers.get('content-type')?.startsWith(EventStreamContentType)
      ) {
        callbacks.onConnected();
        return;
      }

      if (response.status === 401) {
        if (await refreshAccessToken()) {
          throw new Error('access token refreshed');
        }

        clearTokens();
        emitUnauthorized();
        throw new FatalStreamError('登录状态已失效');
      }

      if (response.status >= 400 && response.status < 500) {
        throw new FatalStreamError(`消息订阅失败：${response.status}`);
      }

      throw new Error(`消息订阅暂不可用：${response.status}`);
    },
    onmessage(message) {
      const event = parseNoticeRealtimeEvent(message);
      if (event) callbacks.onEvent(event);
    },
    onclose() {
      callbacks.onDisconnected();
      throw new Error('消息订阅连接已关闭');
    },
    onerror(error) {
      callbacks.onDisconnected();
      if (error instanceof FatalStreamError) throw error;
      return RETRY_INTERVAL_MS;
    },
  }).catch(() => undefined);

  return () => controller.abort();
}

export function parseNoticeRealtimeEvent(
  message: Pick<EventSourceMessage, 'data' | 'event' | 'id'>,
): NoticeRealtimeEvent | null {
  if (
    !NOTICE_REALTIME_EVENT.includes(
      message.event as NoticeRealtimeEventType,
    )
  ) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(message.data);
  } catch {
    return null;
  }

  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    value.id !== message.id ||
    value.type !== message.event ||
    typeof value.occurredAt !== 'string' ||
    !isOptionalPositiveInteger(value.noticeId) ||
    !isOptionalPositiveInteger(value.messageId)
  ) {
    return null;
  }

  return value as unknown as NoticeRealtimeEvent;
}

function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const accessToken = getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value > 0)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
