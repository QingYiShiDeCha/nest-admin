import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { SafeUser } from '@nest-admin/database';

/**
 * 取出 JwtStrategy.validate 挂到 request 上的当前用户。
 * 不传参得到整个用户对象，传 key 得到单个字段，例如 @CurrentUser('id')。
 */
export const CurrentUser = createParamDecorator(
  (key: keyof SafeUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: SafeUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return key ? user[key] : user;
  },
);
