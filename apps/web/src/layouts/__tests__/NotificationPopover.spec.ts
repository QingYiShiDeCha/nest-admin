import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import NotificationPopover from '@/layouts/components/notification-popover/index.vue';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  apiMessageDetail: vi.fn(),
  apiMessageRead: vi.fn(),
  apiRecentMessages: vi.fn(),
  refreshUnreadCount: vi.fn(),
  startRealtime: vi.fn(),
  stopRealtime: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('antdv-next', () => ({
  App: {
    useApp: () => ({
      message: { error: vi.fn(), success: vi.fn() },
    }),
  },
  Badge: {
    name: 'ABadge',
    template: '<span><slot /></span>',
  },
  Button: {
    name: 'AButton',
    template: '<button type="button"><slot /></button>',
  },
  Popover: {
    name: 'APopover',
    props: { open: Boolean },
    emits: ['open-change'],
    template:
      '<div><button data-testid="open-popover" @click="$emit(\'open-change\', true)">open</button><slot /><div v-if="open"><slot name="content" /></div></div>',
  },
  Skeleton: {
    name: 'ASkeleton',
    template: '<div />',
  },
}));

vi.mock('@/api/notices', () => ({
  apiMessageDetail: mocks.apiMessageDetail,
  apiMessageRead: mocks.apiMessageRead,
  apiMessageReadAll: vi.fn(),
  apiRecentMessages: mocks.apiRecentMessages,
}));

vi.mock('@/components/core/base/app-tag/index.vue', () => ({
  default: { name: 'AppTag', template: '<span><slot /></span>' },
}));

vi.mock('@/components/business/messages/message-detail-drawer/index.vue', () => ({
  default: {
    name: 'MessageDetailDrawer',
    props: { open: Boolean, message: Object, loading: Boolean },
    emits: ['update:open'],
    template:
      '<aside v-if="open" data-testid="message-drawer">{{ message?.title }}</aside>',
  },
}));

vi.mock('@/stores/notifications', () => ({
  useNotificationsStore: () => ({
    eventRevision: 0,
    unreadCount: 1,
    refreshUnreadCount: mocks.refreshUnreadCount,
    startRealtime: mocks.startRealtime,
    stopRealtime: mocks.stopRealtime,
  }),
}));

describe('NotificationPopover', () => {
  const notice = {
    id: 7,
    noticeId: 3,
    title: '测试消息',
    content: '内容',
    type: 'notice' as const,
    priority: 'normal' as const,
    publisherName: 'admin',
    publishedAt: '2026-08-30T00:00:00.000Z',
    expiresAt: null,
    readAt: null,
    createdAt: '2026-08-30T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiRecentMessages.mockResolvedValue([notice]);
    mocks.apiMessageDetail.mockResolvedValue(notice);
  });

  async function mountOpenedPopover() {
    const wrapper = mount(NotificationPopover);

    await wrapper.get('[data-testid="open-popover"]').trigger('click');
    await flushPromises();

    return wrapper;
  }

  it('通过 trigger 插槽向 Header 暴露未读数量', () => {
    const wrapper = mount(NotificationPopover, {
      slots: {
        trigger: ({ unreadCount }: { unreadCount: number }) =>
          h('span', { 'data-testid': 'trigger-count' }, String(unreadCount)),
      },
    });

    expect(wrapper.get('[data-testid="trigger-count"]').text()).toBe('1');
  });

  it('点击最近消息在当前页面打开抽屉并标记已读', async () => {
    const wrapper = await mountOpenedPopover();

    await wrapper.get('button.text-left').trigger('click');
    await flushPromises();

    expect(mocks.apiMessageDetail).toHaveBeenCalledWith(7);
    expect(mocks.apiMessageRead).toHaveBeenCalledWith(7);
    expect(mocks.refreshUnreadCount).toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="message-drawer"]').text()).toContain(
      '测试消息',
    );
  });

  it('只有查看全部消息才跳转消息中心页', async () => {
    const wrapper = await mountOpenedPopover();
    const openAllButton = wrapper
      .findAll('button')
      .find((button) => button.text() === '查看全部消息');

    await openAllButton?.trigger('click');

    expect(mocks.push).toHaveBeenCalledWith('/messages');
    expect(mocks.apiMessageDetail).not.toHaveBeenCalled();
    expect(mocks.apiMessageRead).not.toHaveBeenCalled();
  });
});
