import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AppModule } from '../src/app.module';

// 这些是 ConfigModule 校验的必填项，本地没有 .env 时兜一份，
// 让 e2e 在不连真实数据库的情况下也能跑起来
const ENV_FALLBACK: Record<string, string> = {
  DB_HOST: '127.0.0.1',
  DB_USER: 'root',
  DB_NAME: 'nest_admin_test',
  JWT_ACCESS_SECRET: 'e2e-access-secret-must-be-long-enough',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-must-be-long-enough',
};

interface ResponseBody<T = unknown> {
  code: number;
  message: string;
  data: T;
}

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    for (const [key, value] of Object.entries(ENV_FALLBACK)) {
      process.env[key] ??= value;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health 公开可访问且返回统一响应结构', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    const body = response.body as ResponseBody<{ status: string }>;

    expect(body).toMatchObject({ code: 0, message: 'success' });
    // 没连上数据库时是 degraded，连上了是 ok，两者都算接口本身工作正常
    expect(['ok', 'degraded']).toContain(body.data.status);
  });

  it('GET /api/users 未带 token 时被全局守卫拦下', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .expect(401);

    expect((response.body as ResponseBody).code).toBe(401);
  });

  it('POST /api/auth/login 参数不合法时返回校验错误', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ab' })
      .expect(400);

    expect((response.body as ResponseBody).message).toContain('password');
  });
});
