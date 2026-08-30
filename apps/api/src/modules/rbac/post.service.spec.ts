import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE } from '../../database/database.constants';
import { DataScopeService } from './data-scope.service';
import { PostService } from './post.service';

describe('PostService', () => {
  let service: PostService;
  let db: { select: jest.Mock; update: jest.Mock; transaction: jest.Mock };

  const ctx = {
    userId: 1,
    auditOnCreate: () => ({ createdBy: 1, updatedBy: 1 }),
    auditOnUpdate: () => ({ updatedBy: 1 }),
  };
  const subject = { id: 1, deptId: 1, isSuperAdmin: true };
  const dataScopes = { buildUserCondition: jest.fn() };

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn(),
    };
    dataScopes.buildUserCondition.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: DRIZZLE, useValue: db },
        { provide: RequestContext, useValue: ctx },
        { provide: DataScopeService, useValue: dataScopes },
      ],
    }).compile();

    service = module.get(PostService);
  });

  function mockPost(rows: unknown[]): void {
    db.select.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    });
  }

  function mockUserCounts(rows: unknown[]): void {
    db.select.mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () => ({ groupBy: () => Promise.resolve(rows) }),
        }),
      }),
    });
  }

  it('岗位仍有用户时拒绝删除', async () => {
    mockPost([{ id: 2, code: 'developer' }]);
    mockUserCounts([{ postId: 2, userCount: 3 }]);

    await expect(service.remove(2)).rejects.toThrow(
      new ConflictException('该岗位仍有用户，请先解除用户岗位关系'),
    );
    expect(db.update).not.toHaveBeenCalled();
  });

  it('停用岗位不能新分配给用户', async () => {
    mockPost([{ id: 7 }]);
    db.select.mockReturnValueOnce({
      from: () => ({ where: () => Promise.resolve([]) }),
    });
    db.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([{ id: 9, status: 'disabled' }]),
      }),
    });

    await expect(service.setUserPosts(7, [9], subject)).rejects.toThrow(
      new BadRequestException('以下岗位已停用，不能新增分配：9'),
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('查询用户岗位前先应用当前管理员的数据范围', async () => {
    mockPost([]);

    await expect(service.findUserPostIds(99, subject)).rejects.toThrow(
      new NotFoundException('用户 99 不存在'),
    );
    expect(dataScopes.buildUserCondition).toHaveBeenCalledWith(subject);
  });
});
