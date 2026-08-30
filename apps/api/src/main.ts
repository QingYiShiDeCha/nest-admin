import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import type { Env } from './config/env.validation';
import { setupSwagger } from './config/swagger.setup';
import {
  buildLocalUploadPrefixes,
  normalizeLocalUrlPrefix,
  resolveLocalUploadDirectory,
} from './modules/file/file-storage.factory';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService<Env, true>);

  const prefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('PORT', { infer: true });

  // 限流按来源 IP 统计，代理后面必须信任 X-Forwarded-For，
  // 否则所有请求看起来都来自代理，全站共用一个配额；
  // 而直接暴露公网时打开它又会让客户端能伪造该头绕过限流。
  // 因此交给部署方通过 TRUST_PROXY 显式声明，不做自动推断。
  if (config.get('TRUST_PROXY', { infer: true })) {
    app.set('trust proxy', 1);
  }

  if (config.get('UPLOAD_DRIVER', { infer: true }) === 'local') {
    const uploadDirectory = resolveLocalUploadDirectory(config);
    const uploadPrefixes = buildLocalUploadPrefixes(
      prefix,
      normalizeLocalUrlPrefix(config),
    );

    for (const uploadPrefix of uploadPrefixes) {
      app.useStaticAssets(uploadDirectory, { prefix: uploadPrefix });
    }
  }

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
  // 明确打印限流存储，避免线上以为配了 Redis 其实回退到了内存
  logger.log(
    config.get('REDIS_URL', { infer: true })
      ? '限流存储：Redis（多实例共享计数）'
      : '限流存储：进程内存（多实例部署时配额会按实例数翻倍）',
  );
  logger.log(`文件存储：${config.get('UPLOAD_DRIVER', { infer: true })}`);
  if (docsPath) {
    logger.log(`接口文档：http://localhost:${port}/${docsPath}`);
  }
}

void bootstrap();
