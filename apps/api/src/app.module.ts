import { workspaceEnvFiles } from '@nest-admin/shared/node';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // monorepo 只维护根目录一份 .env，靠 pnpm-workspace.yaml 定位，
      // 这样无论从仓库根还是 apps/api 启动都能读到同一份配置
      envFilePath: workspaceEnvFiles(),
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
