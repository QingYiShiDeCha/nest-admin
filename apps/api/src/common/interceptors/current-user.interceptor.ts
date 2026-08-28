import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import type { Observable } from 'rxjs';

import type { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';
import type { AppClsStore } from '../context/request-context.service';

/**
 * 把当前登录用户 id 写进 CLS，供 service 层填充 created_by / updated_by。
 *
 * 用拦截器而不是中间件：中间件在守卫之前执行，那时 request.user 还不存在。
 * 拦截器一定在所有守卫之后运行，此时 JwtAuthGuard 已经把 AuthUser 挂上去了。
 *
 * @Public() 接口不会有 user，此时不写入，RequestContext.userId 返回 null。
 */
@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService<AppClsStore>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    if (request.user) {
      this.cls.set('userId', request.user.id);
    }

    return next.handle();
  }
}
