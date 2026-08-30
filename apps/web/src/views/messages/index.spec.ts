import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import MessageCenterPage from './index.vue';

const mocks = vi.hoisted(() => ({
  apiMessageDetail: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { messageId: '7' } }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('antdv-next', () => ({
  App: {
    useApp: () => ({ message: { error: vi.fn(), success: vi.fn() } }),
  },
  Button: {
    name: 'AButton',
    template: '<button type="button"><slot /></button>',
  },
  Drawer: {
    name: 'ADrawer',
    props: { open: Boolean },
    emits: ['update:open'],
    template: '<aside v-if="open" data-testid="message-drawer"><slot /></aside>',
  },
  Skeleton: {
    name: 'ASkeleton',
    template: '<div />',
  },
}));

vi.mock('@/api/notices', () => ({
  apiMessageDetail: mocks.apiMessageDetail,
  apiMessagePage: vi.fn(),
  apiMessageRead: vi.fn(),
  apiMessageReadAll: vi.fn(),
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

vi.mock('@/components/core/tables/pro-search/index.vue', () => ({
  default: { name: 'ProSearch', template: '<div />' },
}));

vi.mock('@/components/core/tables/pro-table/index.vue', () => ({
  default: {
    name: 'ProTable',
    template: '<div><slot name="toolbar" /></div>',
  },
}));

vi.mock('@/composables/use-table', () => ({
  useTable: () => ({ reload: mocks.reload }),
}));

vi.mock('@/stores/notifications', () => ({
  useNotificationsStore: () => ({
    eventRevision: 0,
    unreadCount: 0,
    refreshUnreadCount: vi.fn(),
  }),
}));

describe('MessageCenterPage', () => {
  it('不根据路由 messageId 自动打开消息详情', async () => {
    mocks.apiMessageDetail.mockResolvedValue({
      id: 7,
      noticeId: 3,
      title: '测试消息',
      content: '内容',
      type: 'notice',
      priority: 'normal',
      publisherName: 'admin',
      publishedAt: '2026-08-30T00:00:00.000Z',
      expiresAt: null,
      readAt: null,
      createdAt: '2026-08-30T00:00:00.000Z',
    });
    const wrapper = mount(MessageCenterPage);

    await flushPromises();

    expect(mocks.apiMessageDetail).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="message-drawer"]').exists()).toBe(false);
  });
});
