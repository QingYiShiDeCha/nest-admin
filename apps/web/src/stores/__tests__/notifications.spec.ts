import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessageUnreadCount } from '@/api/notices';
import { subscribeMessageStream } from '@/api/message-stream';
import { useNotificationsStore } from '@/stores/notifications';

vi.mock('@/api/notices', () => ({ apiMessageUnreadCount: vi.fn() }));

const stream = vi.hoisted(() => ({
  callbacks: null as null | {
    onConnected: () => void;
    onDisconnected: () => void;
    onEvent: (event: {
      id: string;
      type: 'message.created';
      occurredAt: string;
      noticeId: number;
    }) => void;
  },
  stop: vi.fn(),
}));

vi.mock('@/api/message-stream', () => ({
  subscribeMessageStream: vi.fn((callbacks) => {
    stream.callbacks = callbacks;
    return stream.stop;
  }),
}));

describe('notifications store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    stream.callbacks = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('刷新后更新未读数量', async () => {
    vi.mocked(apiMessageUnreadCount).mockResolvedValue({ count: 7 });
    const store = useNotificationsStore();

    await store.refreshUnreadCount();

    expect(store.unreadCount).toBe(7);
  });

  it('轮询失败时保留旧数量，不影响页面', async () => {
    vi.mocked(apiMessageUnreadCount)
      .mockResolvedValueOnce({ count: 3 })
      .mockRejectedValueOnce(new Error('offline'));
    const store = useNotificationsStore();

    await store.refreshUnreadCount();
    await store.refreshUnreadCount();

    expect(store.unreadCount).toBe(3);
  });

  it('启动轮询会立即拉取并按一分钟刷新', async () => {
    vi.useFakeTimers();
    vi.mocked(apiMessageUnreadCount).mockResolvedValue({ count: 1 });
    const store = useNotificationsStore();

    store.startPolling();
    await vi.waitFor(() => expect(apiMessageUnreadCount).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(apiMessageUnreadCount).toHaveBeenCalledTimes(2);
    store.stopPolling();
  });

  it('实时连接断开时轮询降级，恢复后停止轮询', async () => {
    vi.useFakeTimers();
    vi.mocked(apiMessageUnreadCount).mockResolvedValue({ count: 2 });
    const store = useNotificationsStore();

    store.startRealtime();
    expect(subscribeMessageStream).toHaveBeenCalledOnce();
    expect(store.connectionState).toBe('connecting');
    stream.callbacks?.onDisconnected();
    expect(store.connectionState).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(60_000);
    const callsDuringFallback = vi.mocked(apiMessageUnreadCount).mock.calls.length;
    expect(callsDuringFallback).toBeGreaterThanOrEqual(2);

    stream.callbacks?.onConnected();
    expect(store.connectionState).toBe('connected');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(apiMessageUnreadCount).toHaveBeenCalledTimes(callsDuringFallback + 1);

    store.stopRealtime();
    expect(stream.stop).toHaveBeenCalled();
  });

  it('收到业务事件后记录版本并重新查询未读数', async () => {
    vi.mocked(apiMessageUnreadCount).mockResolvedValue({ count: 4 });
    const store = useNotificationsStore();
    store.startRealtime();

    stream.callbacks?.onEvent({
      id: 'event-1',
      type: 'message.created',
      occurredAt: '2026-08-30T00:00:00.000Z',
      noticeId: 6,
    });

    expect(store.eventRevision).toBe(1);
    expect(store.lastEvent?.id).toBe('event-1');
    await vi.waitFor(() =>
      expect(apiMessageUnreadCount).toHaveBeenCalledTimes(2),
    );
    store.stopRealtime();
  });
});
