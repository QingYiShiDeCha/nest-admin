import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface MysqlError extends Error {
  code?: string;
  sqlMessage?: string;
}

function isMysqlError(error: unknown): error is MysqlError {
  return (
    error instanceof Error &&
    typeof (error as MysqlError).code === 'string' &&
    (error as MysqlError).code!.startsWith('ER_')
  );
}

/**
 * 兜底异常过滤器：把任何异常都转成和成功响应同构的 JSON。
 * HttpException 用它自己的状态码，其余一律 500 并只在日志里保留堆栈，不外泄给客户端。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
    } else if (isMysqlError(exception) && exception.code === 'ER_DUP_ENTRY') {
      // 唯一索引冲突：并发下 service 层的预检查会漏掉，这里补一层
      status = HttpStatus.CONFLICT;
      message = '数据已存在，违反唯一约束';
      this.logger.warn(
        `${request.method} ${request.url} -> ${exception.message}`,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} -> 未捕获异常`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
      path: request.url,
      timestamp: Date.now(),
    });
  }

  /** ValidationPipe 抛出的 message 是数组，这里拼成一行方便前端直接展示 */
  private extractMessage(exception: HttpException): string {
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return payload;
    }

    const raw = (payload as { message?: string | string[] }).message;

    if (Array.isArray(raw)) {
      return raw.join('; ');
    }

    return raw ?? exception.message;
  }
}
