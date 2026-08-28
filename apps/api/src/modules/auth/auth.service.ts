import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Env } from '../../config/env.validation';
import type { SafeUser } from '@nest-admin/database';
import { UserService } from '../user/user.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type {
  AuthResult,
  AuthTokens,
  JwtPayload,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.userService.create(dto);

    return { user, ...(await this.issueTokens(user)) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const credentials = await this.userService.findCredentialsByUsername(
      dto.username,
    );

    // 用户不存在和密码错误返回同一句提示，避免账号枚举
    if (
      !credentials ||
      !(await this.userService.verifyPassword(
        dto.password,
        credentials.passwordHash,
      ))
    ) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const { user } = credentials;

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    await this.userService.touchLastLogin(user.id);
    this.logger.log(`用户 ${user.username} 登录成功`);

    return { user, ...(await this.issueTokens(user)) };
  }

  /**
   * 用 refreshToken 换一组新 token。当前实现是无状态的：
   * 只验签名和类型，不落库，因此签发后无法单独吊销某个 refreshToken。
   * 如果需要「踢下线」能力，得把 token 的 jti 存进 Redis 或库里做白名单。
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('请使用 refreshToken 刷新');
    }

    const user = await this.userService
      .findById(payload.sub)
      .catch(() => undefined);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return this.issueTokens(user);
  }

  private async issueTokens(user: SafeUser): Promise<AuthTokens> {
    const base = { sub: user.id, username: user.username };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        ...base,
        type: 'access',
      } satisfies JwtPayload),
      this.jwtService.signAsync(
        { ...base, type: 'refresh' } satisfies JwtPayload,
        {
          secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
