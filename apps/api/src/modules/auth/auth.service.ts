import type { SafeUser } from '@nest-admin/database';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import { RequestContext } from '../../common/context/request-context.service';
import type { Env } from '../../config/env.validation';
import { UserService } from '../user/user.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type {
  AuthResult,
  AuthTokens,
  JwtPayload,
} from './interfaces/jwt-payload.interface';
import { RefreshTokenService } from './refresh-token.service';

/** 通过校验的 refreshToken 一定带 jti，用它避免下游到处判空 */
type VerifiedRefreshPayload = JwtPayload & { jti: string };

/**
 * jsonwebtoken 把 expiresIn 声明成模板字面量类型（'7d' 这种），
 * 而环境变量读出来是普通 string，两者不兼容。
 * 值已由 zod 校验过格式，这里收口成一处断言，不在调用点到处 as。
 */
type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly refreshTokens: RefreshTokenService,
    private readonly ctx: RequestContext,
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
   * 用 refreshToken 换一组新 token，并轮换旧的。
   *
   * 每次刷新都作废旧 jti、签发新 jti。这样一个 refreshToken 只能用一次，
   * 被复制走的那份在真实用户刷新过之后就失效了。
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const check = await this.refreshTokens.check(payload.jti);

    if (!check.ok) {
      if (check.reason === 'reused') {
        // 已作废的 token 又被用了：要么客户端有 bug，要么它被复制走了。
        // 无法区分，按最坏情况处理——把这个用户的所有会话全部踢掉。
        const revoked = await this.refreshTokens.revokeAllForUser(payload.sub);
        this.logger.warn(
          `检测到 refreshToken 重复使用，用户 ${payload.sub} 的 ${revoked} 个会话已全部吊销`,
        );

        throw new UnauthorizedException(
          '检测到令牌重复使用，出于安全考虑已退出所有登录',
        );
      }

      if (check.reason === 'revoked') {
        // 主动登出 / 改密 / 被踢下线导致的失效，只拒绝这一次，不牵连其他设备
        throw new UnauthorizedException('登录态已失效，请重新登录');
      }

      throw new UnauthorizedException('refreshToken 无效或已过期');
    }

    const user = await this.userService
      .findById(payload.sub)
      .catch(() => undefined);

    if (!user || user.status !== 'active') {
      // 用户已被删或禁用，顺手把残留会话清掉
      await this.refreshTokens.revokeAllForUser(payload.sub);
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    const { expiresAt, expiresIn } = this.refreshExpiry();
    const jti = await this.refreshTokens.rotate(
      payload.jti,
      user.id,
      expiresAt,
      this.ctx.client(),
    );

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: await this.signRefreshToken(user, jti, expiresIn),
    };
  }

  /** 主动登出：只吊销本次提交的这个 refreshToken，其他设备不受影响 */
  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken).catch(
      () => undefined,
    );

    // 令牌本身就是坏的，说明这个会话已经不可用，按登出成功处理即可，
    // 没必要把错误抛给正在退出的用户
    if (!payload) {
      return;
    }

    await this.refreshTokens.revoke(payload.jti);
    this.logger.log(`用户 ${payload.username} 已登出`);
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<VerifiedRefreshPayload> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('请使用 refreshToken 刷新');
    }

    // 旧版本签发的 token 没有 jti，无法追踪，一律要求重新登录
    if (!payload.jti) {
      throw new UnauthorizedException('refreshToken 格式已过期，请重新登录');
    }

    return payload as VerifiedRefreshPayload;
  }

  private async issueTokens(user: SafeUser): Promise<AuthTokens> {
    const { expiresAt, expiresIn } = this.refreshExpiry();
    const jti = await this.refreshTokens.issue(
      user.id,
      expiresAt,
      this.ctx.client(),
    );

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: await this.signRefreshToken(user, jti, expiresIn),
    };
  }

  private signAccessToken(user: SafeUser): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      type: 'access',
    } satisfies JwtPayload);
  }

  private signRefreshToken(
    user: SafeUser,
    jti: string,
    expiresIn: ExpiresIn,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        type: 'refresh',
        jti,
      } satisfies JwtPayload,
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn,
      },
    );
  }

  /**
   * 库里的 expires_at 必须和 JWT 自身的 exp 对齐，否则会出现
   * 「JWT 还没过期但库里记录已过期」这类自相矛盾的状态。
   * 这里统一从同一个配置算出来。
   */
  private refreshExpiry(): { expiresAt: Date; expiresIn: ExpiresIn } {
    const raw = this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true });

    return {
      expiresIn: raw as ExpiresIn,
      expiresAt: new Date(Date.now() + parseDuration(raw)),
    };
  }
}

/** 支持 jsonwebtoken 的时长写法：纯数字视为秒，或 30s / 15m / 2h / 7d */
function parseDuration(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(value.trim());

  if (!match) {
    throw new Error(`无法解析的有效期配置：${value}`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const scale: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * scale[unit];
}
