import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { NoticeRealtimeEvent } from '@nest-admin/shared';

import { subscribeMessageStream } from '@/api/message-stream';
import { apiMessageUnreadCount } from '@/api/notices';

const POLL_INTERVAL_MS = 60_000;

export type NotificationConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0);
  const connectionState = ref<NotificationConnectionState>('idle');
  const eventRevision = ref(0);
  const lastEvent = ref<NoticeRealtimeEvent | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopStream: (() => void) | undefined;
  let refreshSequence = 0;

  async function refreshUnreadCount(): Promise<void> {
    const sequence = ++refreshSequence;
    try {
      const result = await apiMessageUnreadCount();
      if (sequence === refreshSequence) unreadCount.value = result.count;
    } catch {
      // Header 轮询失败不打断当前页面，下一轮会自动恢复。
    }
  }

  function startPolling(): void {
    if (timer) return;
    void refreshUnreadCount();
    timer = setInterval(() => void refreshUnreadCount(), POLL_INTERVAL_MS);
  }

  function stopPolling(): void {
    if (timer) clearInterval(timer);
    timer = undefined;
  }

  function startRealtime(): void {
    stopRealtime();
    connectionState.value = 'connecting';
    void refreshUnreadCount();
    stopStream = subscribeMessageStream({
      onConnected: () => {
        connectionState.value = 'connected';
        stopPolling();
        void refreshUnreadCount();
      },
      onDisconnected: () => {
        if (connectionState.value === 'idle') return;
        connectionState.value = 'reconnecting';
        startPolling();
      },
      onEvent: (event) => {
        lastEvent.value = event;
        eventRevision.value += 1;
        void refreshUnreadCount();
      },
    });
  }

  function stopRealtime(): void {
    connectionState.value = 'idle';
    stopStream?.();
    stopStream = undefined;
    stopPolling();
  }

  function reset(): void {
    stopRealtime();
    unreadCount.value = 0;
    eventRevision.value = 0;
    lastEvent.value = null;
  }

  return {
    unreadCount,
    connectionState,
    eventRevision,
    lastEvent,
    refreshUnreadCount,
    startPolling,
    stopPolling,
    startRealtime,
    stopRealtime,
    reset,
  };
});
