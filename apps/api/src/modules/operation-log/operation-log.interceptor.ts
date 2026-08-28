import type { OperationStatus } from '@nest-admin/database';
import {
  HttpException,
  HttpStatus,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  OPERATION_LOG_KEY,
  SKIP_OPERATION_LOG_KEY,
  type OperationLogMeta,
} from './operation-log.decorator';
import { OperationLogService } from './operation-log.service';
import { serializeParams } from './redact';

/** 只记录写操作。GET 量级太大且没有审计价值，记了反而淹没真正要看的东西 */
const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: OperationLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_OPERATION_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip || !LOGGED_METHODS.has(request.method)) {
      return next.handle();
    }

    const meta = this.reflector.getAllAndOverride<OperationLogMeta>(
      OPERATION_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    const startedAt = Date.now();

    // 在 handler 执行前就取好请求快照：handler 内部可能改动 body（如 ValidationPipe 转换后的对象），
    // 而我们要记的是「调用方发来的东西」
    const snapshot = {
      method: request.method,
      path: request.originalUrl ?? request.url,
      ip: request.ip ?? null,
      userAgent: request.get('user-agent')?.slice(0, 255) ?? null,
      params: serializeParams({
        // express 把 body 声明为 any，这里显式收窄成 unknown 再交给脱敏函数处理
        body: request.body as unknown,
        query: request.query,
        params: request.params,
      }),
    };

    return next.handle().pipe(
      tap({
        next: () => this.write(request, meta, snapshot, startedAt, 'success'),
        error: (error: unknown) =>
          this.write(request, meta, snapshot, startedAt, 'failure', error),
      }),
    );
  }

  /**
   * 不 await：日志是旁路，不该把业务响应压在它后面。
   * service.record 内部已吞掉所有异常，这里再挂一个 catch 兜底，
   * 避免任何情况下产生未处理的 Promise rejection。
   */
  private write(
    request: Request & { user?: AuthUser },
    meta: OperationLogMeta | undefined,
    snapshot: {
      method: string;
      path: string;
      ip: string | null;
      userAgent: string | null;
      params: string | null;
    },
    startedAt: number,
    status: OperationStatus,
    error?: unknown,
  ): void {
    // user 由 JwtAuthGuard 挂上，@Public() 接口（如登录）没有，此时留空
    const user = request.user;

    void this.service
      .record({
        userId: user?.id ?? null,
        username: user?.username ?? this.guessUsername(request),
        module: meta?.module ?? null,
        action: meta?.action ?? null,
        ...snapshot,
        status,
        statusCode: this.resolveStatusCode(status, error),
        errorMessage: this.resolveMessage(error),
        durationMs: Date.now() - startedAt,
      })
      .catch(() => undefined);
  }

  /**
   * 登录失败时没有 user，但请求体里的用户名正是审计最需要的信息——
   * 「谁在反复尝试登录」比「某个匿名 IP 试了 20 次」有用得多。
   */
  private guessUsername(request: Request): string | null {
    const body = request.body as { username?: unknown } | undefined;

    return typeof body?.username === 'string'
      ? body.username.slice(0, 32)
      : null;
  }

  private resolveStatusCode(
    status: OperationStatus,
    error?: unknown,
  ): number | null {
    if (status === 'success') {
      return HttpStatus.OK;
    }

    return error instanceof HttpException
      ? error.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(error?: unknown): string | null {
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      return error.message.slice(0, 500);
    }

    // 非 Error 抛出物直接 String() 会得到 [object Object]，用 JSON 更有信息量
    try {
      return JSON.stringify(error)?.slice(0, 500) ?? null;
    } catch {
      return '无法序列化的异常';
    }
  }
}
