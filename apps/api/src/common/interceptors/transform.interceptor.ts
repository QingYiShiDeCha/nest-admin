import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

import type { ApiResponse } from '@nest-admin/shared';

import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';

/**
 * 把 controller 的返回值统一包成 { code, message, data, timestamp }。
 * controller 里只管返回业务数据，不要自己拼这层壳。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const skipTransform =
      Reflect.getMetadata(SKIP_RESPONSE_TRANSFORM_KEY, context.getHandler()) ===
        true ||
      Reflect.getMetadata(SKIP_RESPONSE_TRANSFORM_KEY, context.getClass()) ===
        true;

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data,
        timestamp: Date.now(),
      })),
    );
  }
}
