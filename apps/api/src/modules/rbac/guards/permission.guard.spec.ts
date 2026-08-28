import { PERMISSIONS } from '@nest-admin/shared';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PermissionGuard } from './permission.guard';

const baseUser = {
  id: 1,
  username: 'tester',
  roles: ['editor'],
  permissions: [PERMISSIONS.USER_LIST],
  isSuperAdmin: false,
} as unknown as AuthUser;

/** 造一个只关心 getHandler/getClass 和 request.user 的最小 ExecutionContext */
function contextWith(user?: AuthUser) {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

describe('PermissionGuard', () => {
  let reflector: Reflector;
  let guard: PermissionGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionGuard(reflector);
  });

  const requirePermissions = (codes: string[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(codes);

  it('接口未标注权限码时直接放行', () => {
    requirePermissions(undefined);

    expect(guard.canActivate(contextWith(baseUser))).toBe(true);
  });

  it('标注了空数组同样放行', () => {
    requirePermissions([]);

    expect(guard.canActivate(contextWith(baseUser))).toBe(true);
  });

  it('持有所需权限码时放行', () => {
    requirePermissions([PERMISSIONS.USER_LIST]);

    expect(guard.canActivate(contextWith(baseUser))).toBe(true);
  });

  it('多个权限码满足任意一个即可', () => {
    requirePermissions([PERMISSIONS.USER_DELETE, PERMISSIONS.USER_LIST]);

    expect(guard.canActivate(contextWith(baseUser))).toBe(true);
  });

  it('缺少权限码时抛 403 并说明缺什么', () => {
    requirePermissions([PERMISSIONS.USER_DELETE]);

    expect(() => guard.canActivate(contextWith(baseUser))).toThrow(
      new ForbiddenException(`缺少权限：${PERMISSIONS.USER_DELETE}`),
    );
  });

  it('超管即使权限码为空也放行——这是防止权限配错把管理员锁死的兜底', () => {
    requirePermissions([PERMISSIONS.USER_DELETE]);
    const superAdmin = {
      ...baseUser,
      permissions: [],
      isSuperAdmin: true,
    } as AuthUser;

    expect(guard.canActivate(contextWith(superAdmin))).toBe(true);
  });

  it('request 上没有用户时抛 401，说明守卫顺序被改错了', () => {
    requirePermissions([PERMISSIONS.USER_LIST]);

    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
