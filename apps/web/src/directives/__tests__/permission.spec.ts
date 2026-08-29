import { PERMISSIONS } from '@nest-admin/shared';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/api/types';
import { vPermission } from '@/directives/permission';
import { useAuthStore } from '@/stores/auth';

vi.mock('@/api/auth', () => ({
  apiLogin: vi.fn(),
  apiLogout: vi.fn(),
  apiProfile: vi.fn(),
}));

const profileOf = (overrides: Partial<UserProfile>): UserProfile =>
  ({
    id: 1,
    username: 'tester',
    nickname: null,
    email: null,
    phone: null,
    avatar: null,
    status: 'active',
    lastLoginAt: null,
    createdAt: '',
    updatedAt: '',
    roles: [],
    permissions: [],
    isSuperAdmin: false,
    sessionId: null,
    ...overrides,
  }) as UserProfile;

/** 挂一个带工具栏的壳子，模拟真实用法：容器里若干受控按钮 */
function mountToolbar(code: string) {
  return mount(
    {
      template: `
        <div class="toolbar">
          <button class="keep">列表</button>
          <button class="guarded" v-permission="code">危险操作</button>
        </div>
      `,
      props: { code: { type: [String, Array], required: true } },
    },
    {
      props: { code },
      global: { directives: { permission: vPermission } },
    },
  );
}

describe('v-permission 指令', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('有权限时元素保留', () => {
    useAuthStore().profile = profileOf({
      permissions: [PERMISSIONS.USER_DELETE],
    });

    const wrapper = mountToolbar(PERMISSIONS.USER_DELETE);

    expect(wrapper.find('.guarded').exists()).toBe(true);
  });

  it('无权限时元素从 DOM 里移除，而不是留着隐藏', () => {
    useAuthStore().profile = profileOf({ permissions: [PERMISSIONS.USER_LIST] });

    const wrapper = mountToolbar(PERMISSIONS.USER_DELETE);

    // 关键断言是「不在 DOM 里」：display:none 的按钮仍可被键盘聚焦、
    // 被读屏软件读到，用户碰得到却点不动，比看不见更糟
    expect(wrapper.find('.guarded').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('危险操作');
  });

  it('只摘掉受控元素，不影响同容器里的兄弟节点', () => {
    useAuthStore().profile = profileOf({ permissions: [] });

    const wrapper = mountToolbar(PERMISSIONS.USER_DELETE);

    expect(wrapper.find('.keep').exists()).toBe(true);
    expect(wrapper.find('.guarded').exists()).toBe(false);
  });

  it('超管即使 permissions 为空也保留元素', () => {
    // 后端对超管返回空权限码列表（防自锁），不短路的话超管会看不到任何按钮
    useAuthStore().profile = profileOf({ isSuperAdmin: true, permissions: [] });

    const wrapper = mountToolbar(PERMISSIONS.USER_DELETE);

    expect(wrapper.find('.guarded').exists()).toBe(true);
  });

  it('传一组码时满足其一即保留', () => {
    useAuthStore().profile = profileOf({ permissions: [PERMISSIONS.USER_LIST] });

    const wrapper = mount(
      {
        template: `<button class="guarded" v-permission="codes">操作</button>`,
        props: { codes: { type: Array, required: true } },
      },
      {
        props: { codes: [PERMISSIONS.USER_DELETE, PERMISSIONS.USER_LIST] },
        global: { directives: { permission: vPermission } },
      },
    );

    expect(wrapper.find('.guarded').exists()).toBe(true);
  });
});
