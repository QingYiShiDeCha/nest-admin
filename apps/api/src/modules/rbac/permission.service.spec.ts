import type { DrizzleDB } from '../../database/database.constants';
import { PermissionService } from './permission.service';
import type { RbacCacheService } from './rbac-cache.service';

describe('PermissionService authorization cache', () => {
  const authorization = {
    roles: ['editor'],
    permissions: ['system:user:list'],
    isSuperAdmin: false,
  };

  it('缓存命中时不查询数据库', async () => {
    const db = { select: jest.fn(), selectDistinct: jest.fn() };
    const cache = {
      lookupAuthorization: jest
        .fn()
        .mockResolvedValue({ key: 'authorization-key', value: authorization }),
      store: jest.fn(),
    };
    const service = new PermissionService(
      db as unknown as DrizzleDB,
      cache as unknown as RbacCacheService,
    );

    await expect(service.findUserAuthorization(7)).resolves.toEqual(
      authorization,
    );
    expect(db.select).not.toHaveBeenCalled();
    expect(db.selectDistinct).not.toHaveBeenCalled();
    expect(cache.store).not.toHaveBeenCalled();
  });

  it('缓存 miss 时查询数据库并使用原票据回写', async () => {
    const roleQuery = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: 2, code: 'editor' }]),
    };
    const permissionQuery = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ code: 'system:user:list' }]),
    };
    const db = {
      select: jest.fn(() => roleQuery),
      selectDistinct: jest.fn(() => permissionQuery),
    };
    const lookup = { key: 'authorization-key' };
    const cache = {
      lookupAuthorization: jest.fn().mockResolvedValue(lookup),
      store: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PermissionService(
      db as unknown as DrizzleDB,
      cache as unknown as RbacCacheService,
    );

    await expect(service.findUserAuthorization(7)).resolves.toEqual(
      authorization,
    );
    expect(cache.store).toHaveBeenCalledWith(lookup, authorization);
  });

  it('超级管理员不缓存空权限结果', async () => {
    const roleQuery = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: 1, code: 'super_admin' }]),
    };
    const db = {
      select: jest.fn(() => roleQuery),
      selectDistinct: jest.fn(),
    };
    const cache = {
      lookupAuthorization: jest.fn().mockResolvedValue({ key: 'auth-key' }),
      store: jest.fn(),
    };
    const service = new PermissionService(
      db as unknown as DrizzleDB,
      cache as unknown as RbacCacheService,
    );

    await expect(service.findUserAuthorization(1)).resolves.toEqual({
      roles: ['super_admin'],
      permissions: [],
      isSuperAdmin: true,
    });
    expect(db.selectDistinct).not.toHaveBeenCalled();
    expect(cache.store).not.toHaveBeenCalled();
  });
});
