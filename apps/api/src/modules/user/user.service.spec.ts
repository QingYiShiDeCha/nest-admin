import type { SafeUser } from '@nest-admin/database';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { UserService } from './user.service';

const user: SafeUser = {
  id: 2,
  deptId: 1,
  username: 'admin',
  nickname: '超级管理员',
  email: null,
  phone: null,
  avatar: null,
  status: 'active',
  lockedUntil: null,
  passwordChangedAt: new Date('2026-09-01T00:00:00Z'),
  lastLoginAt: null,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date('2026-08-28T00:00:00Z'),
  updatedAt: new Date('2026-08-28T00:00:00Z'),
};

describe('UserService.updateOwnProfile', () => {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const context = {
    auditOnUpdate: jest.fn(() => ({ updatedBy: user.id })),
  };
  const service = new UserService(
    { update } as never,
    {} as never,
    context as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { assertSatisfied: jest.fn() } as never,
    { clearLock: jest.fn() } as never,
  );
  const findById = jest.spyOn(service, 'findById').mockResolvedValue(user);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('只更新本人可维护的资料并返回最新用户', async () => {
    await expect(
      service.updateOwnProfile(user.id, {
        nickname: '清茶',
        email: null,
        phone: '13800138000',
      }),
    ).resolves.toEqual(user);

    expect(set).toHaveBeenCalledWith({
      nickname: '清茶',
      email: null,
      phone: '13800138000',
      updatedBy: user.id,
    });
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it('拒绝空更新', async () => {
    await expect(service.updateOwnProfile(user.id, {})).rejects.toThrow(
      new BadRequestException('没有需要更新的资料'),
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('UserService 管理入口的数据范围与超管保护', () => {
  /** 非超管调用者，数据范围按 dataScopes 的 mock 放行 */
  const subject = { id: 9, deptId: 2, isSuperAdmin: false };
  const superAdminSubject = { id: 1, deptId: 1, isSuperAdmin: true };

  const buildService = (selectRows: unknown[]) => {
    // isSuperAdminUser 的查询链路：select → from → innerJoin → where → limit；
    // from 同时挂 where，让 findById（select → from → where → limit）也能复用
    const limit = jest.fn().mockResolvedValue(selectRows);
    const where = jest.fn().mockReturnValue({ limit });
    const innerJoin = jest.fn().mockReturnValue({ where });
    const from = jest.fn().mockReturnValue({ innerJoin, where });
    const select = jest.fn().mockReturnValue({ from });
    const dataScopes = {
      assertUserAccessible: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UserService(
      { select } as never,
      {} as never,
      { auditOnUpdate: () => ({ updatedBy: subject.id }) } as never,
      {} as never,
      {} as never,
      dataScopes as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, dataScopes, select };
  };

  it('非超管更新超管账号被拒绝', async () => {
    const { service, dataScopes, select } = buildService([{ id: 100 }]);

    await expect(service.update(1, { nickname: 'x' }, subject)).rejects.toThrow(
      new ForbiddenException('无权操作超级管理员账号'),
    );
    expect(dataScopes.assertUserAccessible).toHaveBeenCalledWith(1, subject);
    expect(select).toHaveBeenCalledTimes(1); // 只查了超管角色绑定
  });

  it('非超管删除超管账号被拒绝', async () => {
    const { service, select } = buildService([{ id: 100 }]);
    const db = { select } as { select: jest.Mock; transaction?: jest.Mock };
    db.transaction = jest.fn();

    await expect(service.remove(1, subject)).rejects.toThrow(
      new ForbiddenException('无权操作超级管理员账号'),
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('目标用户超出数据范围时按不存在处理，不再查超管绑定', async () => {
    const { service, dataScopes, select } = buildService([]);
    dataScopes.assertUserAccessible.mockRejectedValue(
      new NotFoundException('用户 1 不存在'),
    );

    await expect(service.remove(1, subject)).rejects.toThrow(
      new NotFoundException('用户 1 不存在'),
    );
    expect(select).not.toHaveBeenCalled();
  });

  it('超管操作超管账号不受第二条限制（数据范围直接放行）', async () => {
    const { service, dataScopes, select } = buildService([]);

    // 守卫放行后才会走到 findById；mock 查不到用户抛 NotFound，正好作为「已通过守卫」的标记
    await expect(
      service.update(1, { nickname: 'x' }, superAdminSubject),
    ).rejects.toThrow(new NotFoundException('用户 1 不存在'));
    expect(dataScopes.assertUserAccessible).toHaveBeenCalledWith(
      1,
      superAdminSubject,
    );
    expect(select).toHaveBeenCalledTimes(1); // 只发生了 findById 这一次查询
  });
});
