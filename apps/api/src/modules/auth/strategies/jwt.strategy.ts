import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { Env } from '../../../config/env.validation';
import type { SafeUser } from '@nest-admin/database';
import { UserService } from '../../user/user.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /**
   * 每次请求都回库查一次用户，这样禁用或删除用户能立刻生效，
   * 代价是每个受保护请求多一次主键查询——后续要优化就在这里加缓存。
   */
  async validate(payload: JwtPayload): Promise<SafeUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('请使用 accessToken 访问');
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

    return user;
  }
}
