import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

/**
 * 取出 JwtStrategy.validate 挂到 request 上的当前用户（含角色与权限码）。
 * 不传参得到整个对象，传 key 得到单个字段，例如 @CurrentUser('id')。
 */
export const CurrentUser = createParamDecorator(
  (key: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return key ? user[key] : user;
  },
);
