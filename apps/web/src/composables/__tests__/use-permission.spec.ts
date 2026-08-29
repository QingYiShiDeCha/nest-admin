import { PERMISSIONS } from '@nest-admin/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/api/types';
import { checkPermission, usePermission } from '@/composables/use-permission';
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

describe('checkPermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('单个码：命中才通过', () => {
    useAuthStore().profile = profileOf({ permissions: [PERMISSIONS.USER_LIST] });

    expect(checkPermission(PERMISSIONS.USER_LIST)).toBe(true);
    expect(checkPermission(PERMISSIONS.USER_DELETE)).toBe(false);
  });

  it('一组码：满足其一即可，与后端 @Permissions 语义一致', () => {
    useAuthStore().profile = profileOf({ permissions: [PERMISSIONS.USER_LIST] });

    expect(
      checkPermission([PERMISSIONS.USER_DELETE, PERMISSIONS.USER_LIST]),
    ).toBe(true);
    expect(checkPermission([PERMISSIONS.USER_DELETE])).toBe(false);
  });

  it('空码失败开放：真正的关卡在后端，前端不该让写错的码静默隐藏元素', () => {
    useAuthStore().profile = profileOf({ permissions: [] });

    expect(checkPermission([])).toBe(true);
  });

  it('超管在 permissions 为空时也全部通过', () => {
    useAuthStore().profile = profileOf({ isSuperAdmin: true, permissions: [] });

    expect(checkPermission(PERMISSIONS.LOG_CLEAN)).toBe(true);
  });

  it('未登录时任何码都不通过', () => {
    expect(checkPermission(PERMISSIONS.USER_LIST)).toBe(false);
  });
});

describe('usePermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('暴露的 can 与 checkPermission 是同一套判定', () => {
    useAuthStore().profile = profileOf({ permissions: [PERMISSIONS.ROLE_LIST] });

    const { can } = usePermission();

    expect(can(PERMISSIONS.ROLE_LIST)).toBe(true);
    expect(can(PERMISSIONS.ROLE_DELETE)).toBe(false);
  });

  it('profile 变化后 can 的结果跟着变（模板里靠这点保持响应式）', () => {
    const auth = useAuthStore();
    const { can, isSuperAdmin } = usePermission();

    expect(can(PERMISSIONS.USER_LIST)).toBe(false);
    expect(isSuperAdmin.value).toBe(false);

    auth.profile = profileOf({ isSuperAdmin: true });

    expect(can(PERMISSIONS.USER_LIST)).toBe(true);
    expect(isSuperAdmin.value).toBe(true);
  });
});
