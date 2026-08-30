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
 * 把当前请求的上下文写进 CLS：登录用户 id（供审计字段）、
 * 客户端 IP 与 UA（供 refreshToken 的会话记录）。
 *
 * 用拦截器而不是中间件：中间件在守卫之前执行，那时 request.user 还不存在。
 * 拦截器一定在所有守卫之后运行，此时 JwtAuthGuard 已经把 AuthUser 挂上去了。
 *
 * @Public() 接口不会有 user，此时先只写 ip/ua；若业务随后自行验明身份，
 * 可通过 RequestContext.setUser 补充操作人。
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService<AppClsStore>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    if (request.user) {
      this.cls.set('userId', request.user.id);
      this.cls.set('username', request.user.username);
    }

    if (request.ip) {
      this.cls.set('ip', request.ip);
    }

    const userAgent = request.get('user-agent');

    if (userAgent) {
      this.cls.set('userAgent', userAgent);
    }

    return next.handle();
  }
}
