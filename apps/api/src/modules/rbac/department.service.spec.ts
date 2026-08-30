import {
  DepartmentService,
  buildDepartmentTree,
  type DepartmentRecord,
} from './department.service';
import type { DrizzleDB } from '../../database/database.constants';
import type { RequestContext } from '../../common/context/request-context.service';
import type { RbacCacheService } from './rbac-cache.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

const department = (
  id: number,
  name: string,
  parentId: number | null,
): DepartmentRecord => ({
  id,
  parentId,
  name,
  code: `dept_${id}`,
  leaderId: null,
  leaderName: null,
  phone: null,
  email: null,
  sort: id,
  status: 'active',
  createdBy: null,
  updatedBy: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
});

describe('buildDepartmentTree', () => {
  it('按父子关系构建组织树并附加直属用户数', () => {
    const tree = buildDepartmentTree(
      [
        department(1, '总公司', null),
        department(2, '研发中心', 1),
        department(3, '前端组', 2),
        department(4, '市场中心', 1),
      ],
      new Map([
        [1, 1],
        [3, 4],
      ]),
    );

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('总公司');
    expect(tree[0].userCount).toBe(1);
    expect(tree[0].children.map((item) => item.name)).toEqual([
      '研发中心',
      '市场中心',
    ]);
    expect(tree[0].children[0].children[0]).toMatchObject({
      name: '前端组',
      userCount: 4,
    });
  });

  it('父节点不在结果集时把节点提升为根，支持搜索结果保留', () => {
    const tree = buildDepartmentTree([department(3, '前端组', 2)]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(3);
  });
});

function queryResult(rows: unknown[]) {
  const chain: Record<string, jest.Mock> = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.limit = jest.fn().mockResolvedValue(rows);
  chain.orderBy = jest.fn().mockResolvedValue(rows);
  return chain;
}

function createUpdateHarness(selectRows: unknown[][], affectedRows = 1) {
  const select = jest.fn();
  for (const rows of selectRows) {
    select.mockReturnValueOnce(queryResult(rows));
  }

  const insertValues = jest.fn().mockResolvedValue([{ insertId: 1 }]);
  const transactionUpdateWhere = jest
    .fn()
    .mockResolvedValue([{ affectedRows }]);
  const tx = {
    update: jest.fn(() => ({
      set: jest.fn(() => ({ where: transactionUpdateWhere })),
    })),
    insert: jest.fn(() => ({ values: insertValues })),
  };
  const transaction = jest.fn(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const db = { select, transaction } as unknown as DrizzleDB;
  const ctx = {
    userId: 9,
    auditOnUpdate: () => ({ updatedBy: 9 }),
  } as unknown as RequestContext;
  const invalidateDepartmentTree = jest.fn().mockResolvedValue(undefined);
  const cache = { invalidateDepartmentTree } as unknown as RbacCacheService;

  return {
    service: new DepartmentService(db, ctx, cache),
    insertValues,
    transaction,
    invalidateDepartmentTree,
  };
}

describe('DepartmentService.update department transfer', () => {
  const current = department(2, '研发中心', 1);
  const moved = department(2, '研发中心', 3);

  it('变更上级部门但未填写原因时拒绝更新', async () => {
    const { service, transaction } = createUpdateHarness([
      [{ department: current, leaderName: null }],
    ]);

    await expect(service.update(2, { parentId: 3 })).rejects.toThrow(
      new BadRequestException('变更上级部门时必须填写迁移原因'),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('在同一事务更新父级并保存名称与操作人快照', async () => {
    const { service, insertValues, transaction, invalidateDepartmentTree } =
      createUpdateHarness([
        [{ department: current, leaderName: null }],
        [{ id: 3 }],
        [
          { department: department(1, '总公司', null), leaderName: null },
          { department: current, leaderName: null },
          { department: department(3, '技术委员会', 1), leaderName: null },
        ],
        [{ name: '总公司' }],
        [{ name: '技术委员会' }],
        [{ name: '管理员' }],
        [{ department: moved, leaderName: null }],
      ]);

    await expect(
      service.update(2, { parentId: 3, moveReason: '组织架构调整' }),
    ).resolves.toMatchObject({ id: 2, parentId: 3 });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(invalidateDepartmentTree).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith({
      deptId: 2,
      deptName: '研发中心',
      fromParentId: 1,
      fromParentName: '总公司',
      toParentId: 3,
      toParentName: '技术委员会',
      reason: '组织架构调整',
      operatorId: 9,
      operatorName: '管理员',
    });
  });

  it('父级已被并发修改时不写入迁移历史', async () => {
    const { service, insertValues } = createUpdateHarness(
      [
        [{ department: current, leaderName: null }],
        [{ id: 3 }],
        [
          { department: department(1, '总公司', null), leaderName: null },
          { department: current, leaderName: null },
          { department: department(3, '技术委员会', 1), leaderName: null },
        ],
        [{ name: '总公司' }],
        [{ name: '技术委员会' }],
        [{ name: '管理员' }],
      ],
      0,
    );

    await expect(
      service.update(2, { parentId: 3, moveReason: '组织架构调整' }),
    ).rejects.toThrow(
      new ConflictException('部门上级已被其他操作修改，请刷新后重试'),
    );
    expect(insertValues).not.toHaveBeenCalled();
  });
});
