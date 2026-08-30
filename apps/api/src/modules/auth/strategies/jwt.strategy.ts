import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { Env } from '../../../config/env.validation';
import { PermissionService } from '../../rbac/permission.service';
import { UserService } from '../../user/user.service';
import type { AuthUser } from '../interfaces/auth-user.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RefreshTokenService } from '../refresh-token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly refreshTokens: RefreshTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /**
   * 每次请求都回库查用户与授权，这样禁用用户、改角色权限能立刻生效，
   * 代价是每个受保护请求多几次查询——后续要优化就在这里加缓存。
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('请使用 accessToken 访问');
    }

    if (!payload.sid) {
      throw new UnauthorizedException('登录态无法识别，请重新登录');
    }

    const session = await this.refreshTokens.check(payload.sid);

    if (!session.ok || session.record.userId !== payload.sub) {
      throw new UnauthorizedException('登录态已失效，请重新登录');
    }

    const user = await this.userService
      .findById(payload.sub)
      .catch(() => undefined);

    if (!user) {
      throw new UnauthorizedException('用户不存在或已被删除');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const authorization = await this.permissionService.findUserAuthorization(
      user.id,
    );

    return { ...user, ...authorization, sessionId: payload.sid ?? null };
  }
}
