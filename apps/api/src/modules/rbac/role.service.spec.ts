import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE } from '../../database/database.constants';
import { RoleService } from './role.service';
import { RbacCacheService } from './rbac-cache.service';

/**
 * 这里只测不依赖真实 SQL 的分支——即那些在发起查询之前就该拦下的规则。
 * 真正的查询行为（软删除过滤、事务回滚、级联）由连真库的手工验证覆盖，
 * 用 mock 去模拟 Drizzle 的链式调用只会测出 mock 本身写得对不对。
 */
describe('RoleService 的保护性规则', () => {
  let service: RoleService;
  let db: { select: jest.Mock };
  let cache: { invalidateUsers: jest.Mock };

  /** 当前操作人固定为 1，用来验证「不允许改自己的角色」这条规则 */
  const ctx = {
    userId: 1,
    auditOnCreate: () => ({ createdBy: 1, updatedBy: 1 }),
    auditOnUpdate: () => ({ updatedBy: 1 }),
  };

  const mockSelectOnce = (rows: unknown[]) => {
    db.select.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    });
  };

  beforeEach(async () => {
    db = { select: jest.fn() };
    cache = { invalidateUsers: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: DRIZZLE, useValue: db },
        { provide: RequestContext, useValue: ctx },
        {
          provide: RbacCacheService,
          useValue: cache,
        },
      ],
    }).compile();

    service = module.get(RoleService);
  });

  it('不允许修改自己的角色，避免误摘超管后失去修复能力', async () => {
    await expect(service.setUserRoles(1, [2])).rejects.toThrow(
      new ForbiddenException('不允许修改自己的角色，请由其他管理员操作'),
    );
    // 应该在任何查询之前就拦下
    expect(db.select).not.toHaveBeenCalled();
  });

  it('内置角色不允许改角色码', async () => {
    mockSelectOnce([
      { id: 1, code: 'super_admin', isSystem: true, status: 'active' },
    ]);

    await expect(service.update(1, { code: 'hacked' })).rejects.toThrow(
      new ForbiddenException('内置角色的角色码不允许修改'),
    );
  });

  it('内置角色不允许停用——停用会把所有超管一起锁在系统外', async () => {
    mockSelectOnce([
      { id: 1, code: 'super_admin', isSystem: true, status: 'active' },
    ]);

    await expect(service.update(1, { status: 'disabled' })).rejects.toThrow(
      new ForbiddenException('内置角色不允许停用'),
    );
  });

  it('内置角色不允许删除', async () => {
    mockSelectOnce([
      { id: 1, code: 'super_admin', isSystem: true, status: 'active' },
    ]);

    await expect(service.remove(1)).rejects.toThrow(
      new ForbiddenException('内置角色不允许删除'),
    );
  });

  it('角色不存在时抛 404', async () => {
    mockSelectOnce([]);

    await expect(service.remove(404)).rejects.toThrow(
      new NotFoundException('角色 404 不存在'),
    );
  });

  it('普通角色改备注不受内置保护影响', async () => {
    mockSelectOnce([
      { id: 2, code: 'editor', isSystem: false, status: 'active' },
    ]);
    // 后续 update/查询链路交给真库验证，这里只确认没有被保护规则拦下
    db.select.mockReturnValue({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([{ id: 2 }]) }),
      }),
    });
    const update = jest.fn().mockReturnValue({
      set: () => ({ where: () => Promise.resolve(undefined) }),
    });
    (db as unknown as { update: unknown }).update = update;
    (db as unknown as { transaction: unknown }).transaction = async (
      callback: (tx: { update: typeof update }) => Promise<void>,
    ) => callback({ update });

    await expect(service.update(2, { remark: 'ok' })).resolves.toBeDefined();
    expect(update).toHaveBeenCalled();
    expect(cache.invalidateUsers).not.toHaveBeenCalled();
  });

  it('替换用户角色后主动失效该用户授权与数据范围缓存', async () => {
    mockSelectOnce([{ id: 2 }]);
    db.select.mockReturnValueOnce({
      from: () => ({ where: () => Promise.resolve([{ id: 3 }]) }),
    });

    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    const insertValues = jest.fn().mockResolvedValue(undefined);
    (db as unknown as { transaction: unknown }).transaction = async (
      callback: (tx: {
        delete: () => { where: typeof deleteWhere };
        insert: () => { values: typeof insertValues };
      }) => Promise<void>,
    ) =>
      callback({
        delete: () => ({ where: deleteWhere }),
        insert: () => ({ values: insertValues }),
      });

    await service.setUserRoles(2, [3]);

    expect(cache.invalidateUsers).toHaveBeenCalledWith([2]);
  });
});
