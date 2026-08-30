import { Test, type TestingModule } from '@nestjs/testing';

import { DRIZZLE } from '../../database/database.constants';
import { DataScopeService } from './data-scope.service';
import { DepartmentService } from './department.service';

describe('DataScopeService', () => {
  let service: DataScopeService;
  let db: { select: jest.Mock; selectDistinct: jest.Mock };
  let departments: { findDescendantIds: jest.Mock };

  beforeEach(async () => {
    db = { select: jest.fn(), selectDistinct: jest.fn() };
    departments = { findDescendantIds: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataScopeService,
        { provide: DRIZZLE, useValue: db },
        { provide: DepartmentService, useValue: departments },
      ],
    }).compile();

    service = module.get(DataScopeService);
  });

  function mockAssignedRoles(rows: { id: number; dataScope: string }[]): void {
    db.select.mockReturnValue({
      from: () => ({
        innerJoin: () => ({ where: () => Promise.resolve(rows) }),
      }),
    });
  }

  it('超级管理员不查询角色并直接返回全量', async () => {
    await expect(
      service.buildUserCondition({ id: 1, deptId: 1, isSuperAdmin: true }),
    ).resolves.toBeUndefined();
    expect(db.select).not.toHaveBeenCalled();
  });

  it('任一角色拥有 all 时返回全量', async () => {
    mockAssignedRoles([
      { id: 2, dataScope: 'self' },
      { id: 3, dataScope: 'all' },
    ]);

    await expect(
      service.buildUserCondition({ id: 7, deptId: 2, isSuperAdmin: false }),
    ).resolves.toBeUndefined();
  });

  it('本部门及下级会解析完整部门集合', async () => {
    mockAssignedRoles([{ id: 2, dataScope: 'dept_and_below' }]);
    departments.findDescendantIds.mockResolvedValue([5, 6, 7]);

    await expect(
      service.buildUserCondition({ id: 8, deptId: 5, isSuperAdmin: false }),
    ).resolves.toBeDefined();
    expect(departments.findDescendantIds).toHaveBeenCalledWith(5);
  });

  it('自定义范围读取角色部门关联', async () => {
    mockAssignedRoles([{ id: 9, dataScope: 'custom' }]);
    db.selectDistinct.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ id: 11 }, { id: 12 }]) }),
    });

    await expect(
      service.buildUserCondition({ id: 8, deptId: null, isSuperAdmin: false }),
    ).resolves.toBeDefined();
    expect(db.selectDistinct).toHaveBeenCalledTimes(1);
  });

  it('没有有效角色时返回拒绝全部数据的条件', async () => {
    mockAssignedRoles([]);

    await expect(
      service.buildUserCondition({ id: 8, deptId: null, isSuperAdmin: false }),
    ).resolves.toBeDefined();
  });
});
