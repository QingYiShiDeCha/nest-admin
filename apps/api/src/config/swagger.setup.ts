import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, prefix: string): string {
  const path = `${prefix}/docs`;

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('nest-admin API')
      .setDescription('后台管理系统接口文档')
      .setVersion('0.0.1')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .build(),
  );

  SwaggerModule.setup(path, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  return path;
}
