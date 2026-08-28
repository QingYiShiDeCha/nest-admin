import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';

import type { SafeUser } from '@nest-admin/database';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const ACCESS_SECRET = 'unit-test-access-secret';
const REFRESH_SECRET = 'unit-test-refresh-secret';
const PASSWORD = 'admin123456';

const CONFIG: Record<string, string> = {
  JWT_ACCESS_SECRET: ACCESS_SECRET,
  JWT_ACCESS_EXPIRES_IN: '30m',
  JWT_REFRESH_SECRET: REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: '7d',
};

const USER: SafeUser = {
  id: 1,
  username: 'admin',
  nickname: '超级管理员',
  email: null,
  phone: null,
  avatar: null,
  status: 'active',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: jest.Mocked<
    Pick<
      UserService,
      | 'findCredentialsByUsername'
      | 'verifyPassword'
      | 'touchLastLogin'
      | 'findById'
    >
  >;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hash(PASSWORD, 4);
  });

  beforeEach(async () => {
    userService = {
      findCredentialsByUsername: jest.fn(),
      // 真实实现就是 bcrypt.compare，这里保持同样语义
      verifyPassword: jest.fn(),
      touchLastLogin: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(USER),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: ACCESS_SECRET,
          signOptions: { expiresIn: '30m' },
        }),
      ],
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => CONFIG[key] },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  it('登录成功后签发的 accessToken 用 access 密钥可验签且带 access 类型', async () => {
    userService.findCredentialsByUsername.mockResolvedValue({
      user: USER,
      passwordHash,
    });
    userService.verifyPassword.mockResolvedValue(true);

    const result = await service.login({
      username: 'admin',
      password: PASSWORD,
    });

    expect(result.user).toEqual(USER);
    expect(userService.touchLastLogin).toHaveBeenCalledWith(USER.id);

    const payload = await jwtService.verifyAsync<JwtPayload>(
      result.accessToken,
      { secret: ACCESS_SECRET },
    );
    expect(payload).toMatchObject({
      sub: 1,
      username: 'admin',
      type: 'access',
    });

    const refreshPayload = await jwtService.verifyAsync<JwtPayload>(
      result.refreshToken,
      { secret: REFRESH_SECRET },
    );
    expect(refreshPayload.type).toBe('refresh');
  });

  it('密码错误时抛 401 且不暴露账号是否存在', async () => {
    userService.findCredentialsByUsername.mockResolvedValue({
      user: USER,
      passwordHash,
    });
    userService.verifyPassword.mockResolvedValue(false);

    await expect(
      service.login({ username: 'admin', password: 'wrong-password-1' }),
    ).rejects.toThrow(new UnauthorizedException('用户名或密码错误'));
  });

  it('账号被禁用时不允许登录', async () => {
    userService.findCredentialsByUsername.mockResolvedValue({
      user: { ...USER, status: 'disabled' },
      passwordHash,
    });
    userService.verifyPassword.mockResolvedValue(true);

    await expect(
      service.login({ username: 'admin', password: PASSWORD }),
    ).rejects.toThrow(new UnauthorizedException('账号已被禁用'));
  });

  it('refresh 能换出新 token 对', async () => {
    const refreshToken = await jwtService.signAsync(
      { sub: USER.id, username: USER.username, type: 'refresh' },
      { secret: REFRESH_SECRET, expiresIn: '7d' },
    );

    const tokens = await service.refresh(refreshToken);

    await expect(
      jwtService.verifyAsync<JwtPayload>(tokens.accessToken, {
        secret: ACCESS_SECRET,
      }),
    ).resolves.toMatchObject({ type: 'access' });
  });

  it('拿 accessToken 当 refreshToken 用会被拒绝', async () => {
    // 故意用 refresh 密钥签一个 access 类型的 token，绕过签名校验只留类型校验
    const wrongTypeToken = await jwtService.signAsync(
      { sub: USER.id, username: USER.username, type: 'access' },
      { secret: REFRESH_SECRET },
    );

    await expect(service.refresh(wrongTypeToken)).rejects.toThrow(
      new UnauthorizedException('请使用 refreshToken 刷新'),
    );
  });

  it('refreshToken 签名不对时抛 401', async () => {
    const forged = await jwtService.signAsync(
      { sub: USER.id, username: USER.username, type: 'refresh' },
      { secret: 'some-other-secret' },
    );

    await expect(service.refresh(forged)).rejects.toThrow(
      new UnauthorizedException('refreshToken 无效或已过期'),
    );
  });
});
