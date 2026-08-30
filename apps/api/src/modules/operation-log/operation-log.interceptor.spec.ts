import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { lastValueFrom, of } from 'rxjs';

import type { RequestContext } from '../../common/context/request-context.service';
import { OperationLogInterceptor } from './operation-log.interceptor';
import type { OperationLogService } from './operation-log.service';

describe('OperationLogInterceptor', () => {
  it('公共接口在业务验明身份后从请求上下文记录操作人', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/auth/refresh',
      ip: '127.0.0.1',
      body: { refreshToken: 'redacted-by-serializer' },
      query: {},
      params: {},
      get: jest.fn().mockReturnValue('jest'),
    } as unknown as Request;
    const executionContext = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ module: '认证', action: '刷新令牌' }),
    } as unknown as Reflector;
    const record = jest.fn().mockResolvedValue(undefined);
    const service = { record } as unknown as OperationLogService;
    const requestContext = {
      userId: 1,
      username: 'admin',
    } as unknown as RequestContext;
    const interceptor = new OperationLogInterceptor(
      reflector,
      service,
      requestContext,
    );
    const next = { handle: () => of(undefined) } as CallHandler;

    await lastValueFrom(interceptor.intercept(executionContext, next));

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        username: 'admin',
        path: '/api/auth/refresh',
        status: 'success',
      }),
    );
  });
});
