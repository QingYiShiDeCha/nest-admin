import { PERMISSIONS } from '@nest-admin/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/api/types';
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

describe('auth store 的权限判定', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('未登录时任何权限都不满足', () => {
    const auth = useAuthStore();

    expect(auth.hasPermission(PERMISSIONS.USER_LIST)).toBe(false);
    expect(auth.hasAnyPermission([PERMISSIONS.USER_LIST])).toBe(false);
  });

  it('拥有该权限码时通过', () => {
    const auth = useAuthStore();
    auth.profile = profileOf({ permissions: [PERMISSIONS.USER_LIST] });

    expect(auth.hasPermission(PERMISSIONS.USER_LIST)).toBe(true);
    expect(auth.hasPermission(PERMISSIONS.USER_DELETE)).toBe(false);
  });

  it('hasAnyPermission 满足其一即可，与后端 @Permissions 语义一致', () => {
    const auth = useAuthStore();
    auth.profile = profileOf({ permissions: [PERMISSIONS.USER_LIST] });

    expect(
      auth.hasAnyPermission([PERMISSIONS.USER_DELETE, PERMISSIONS.USER_LIST]),
    ).toBe(true);
    expect(auth.hasAnyPermission([PERMISSIONS.USER_DELETE])).toBe(false);
  });

  it('超管在 permissions 为空时也全部通过', () => {
    // 后端 PermissionGuard 对超管直接放行、profile 返回空 permissions。
    // 这里不短路的话超管会看不到任何按钮
    const auth = useAuthStore();
    auth.profile = profileOf({ isSuperAdmin: true, permissions: [] });

    expect(auth.hasPermission(PERMISSIONS.USER_DELETE)).toBe(true);
    expect(auth.hasAnyPermission([PERMISSIONS.LOG_CLEAN])).toBe(true);
  });

  it('reset 清空 profile 与登录标记', () => {
    const auth = useAuthStore();
    auth.profile = profileOf({ isSuperAdmin: true });
    auth.loggedIn = true;

    auth.reset();

    expect(auth.profile).toBeNull();
    expect(auth.loggedIn).toBe(false);
    expect(auth.hasPermission(PERMISSIONS.USER_LIST)).toBe(false);
  });
});
