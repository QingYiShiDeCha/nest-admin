import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('普通响应保持统一 API 外壳', async () => {
    const payload = { id: 1 };
    const result = await firstValueFrom(
      interceptor.intercept(buildContext(), buildHandler(payload)),
    );

    expect(result).toMatchObject({
      code: 0,
      message: 'success',
      data: payload,
    });
  });

  it('流式端点跳过包装并原样发送事件', async () => {
    const handler = (): void => undefined;
    Reflect.defineMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true, handler);
    const event = { type: 'heartbeat', data: { occurredAt: 'now' } };
    const result = await firstValueFrom(
      interceptor.intercept(buildContext(handler), buildHandler(event)),
    );

    expect(result).toBe(event);
  });
});

function buildContext(handler = (): void => undefined): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

function buildHandler<T>(value: T): CallHandler<T> {
  return { handle: () => of(value) };
}
