import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = { get: jest.fn().mockReturnValue('test-secret') };
  const userService = { findById: jest.fn() };
  const permissionService = { findUserAuthorization: jest.fn() };
  const refreshTokens = { check: jest.fn() };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      config as never,
      userService as never,
      permissionService as never,
      refreshTokens as never,
    );
  });

  it('会话有效时允许 access token 继续访问', async () => {
    refreshTokens.check.mockResolvedValue({
      ok: true,
      record: { userId: 1 },
    });
    userService.findById.mockResolvedValue({
      id: 1,
      username: 'admin',
      status: 'active',
    });
    permissionService.findUserAuthorization.mockResolvedValue({
      roles: ['super_admin'],
      permissions: [],
      isSuperAdmin: true,
    });

    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        type: 'access',
        sid: 'current-jti',
      }),
    ).resolves.toMatchObject({ id: 1, sessionId: 'current-jti' });
  });

  it('会话被删除或吊销后拒绝旧 access token', async () => {
    refreshTokens.check.mockResolvedValue({ ok: false, reason: 'unknown' });

    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        type: 'access',
        sid: 'deleted-jti',
      }),
    ).rejects.toThrow(new UnauthorizedException('登录态已失效，请重新登录'));
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('拒绝会话与用户不匹配的 access token', async () => {
    refreshTokens.check.mockResolvedValue({
      ok: true,
      record: { userId: 2 },
    });

    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        type: 'access',
        sid: 'other-user-jti',
      }),
    ).rejects.toThrow(new UnauthorizedException('登录态已失效，请重新登录'));
  });

  it('拒绝没有会话标识的旧 access token', async () => {
    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        type: 'access',
      }),
    ).rejects.toThrow(new UnauthorizedException('登录态无法识别，请重新登录'));
    expect(refreshTokens.check).not.toHaveBeenCalled();
  });
});
