import type { SafeUser } from '@nest-admin/database';
import { BadRequestException } from '@nestjs/common';

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
