import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import type { Env } from './config/env.validation';
import { setupSwagger } from './config/swagger.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  const prefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('PORT', { infer: true });

  app.setGlobalPrefix(prefix);
  app.enableCors();
  // 让 DatabaseModule.onApplicationShutdown 有机会关掉连接池
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const docsPath = config.get('SWAGGER_ENABLED', { infer: true })
    ? setupSwagger(app, prefix)
    : undefined;

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`服务已启动：http://localhost:${port}/${prefix}`);
  if (docsPath) {
    logger.log(`接口文档：http://localhost:${port}/${docsPath}`);
  }
}

void bootstrap();
