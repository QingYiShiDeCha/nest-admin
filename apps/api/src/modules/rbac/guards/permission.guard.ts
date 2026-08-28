import type { PermissionCode } from '@nest-admin/shared';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';

/**
 * 权限码校验。必须在 JwtAuthGuard 之后执行，依赖它把 AuthUser 挂到 request 上。
 * 注册顺序见 AppModule 的 APP_GUARD 数组。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 没标权限码的接口只要登录即可，@Public() 的接口在 JwtAuthGuard 就放行了
    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      // 正常不会走到：标了权限码却没登录，说明守卫顺序被改错了
      throw new UnauthorizedException('未认证');
    }

    // 超管短路。放在权限比对之前，保证权限数据配错时管理员仍能进来修复
    if (user.isSuperAdmin) {
      return true;
    }

    const granted = required.some((code) => user.permissions.includes(code));

    if (!granted) {
      throw new ForbiddenException(`缺少权限：${required.join(' 或 ')}`);
    }

    return true;
  }
}
