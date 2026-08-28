import { workspaceEnvFiles } from '@nest-admin/shared/node';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from './modules/rbac/guards/permission.guard';
import { RbacModule } from './modules/rbac/rbac.module';
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
    RbacModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 两个全局守卫都在这里注册，顺序即执行顺序，不能颠倒：
    // JwtAuthGuard 负责认证并把 AuthUser 挂到 request 上，
    // PermissionGuard 依赖它的产物做权限码比对。
    // 放在同一个 providers 数组里是为了让顺序显式可见——
    // 分散到各自模块时，执行顺序取决于模块解析顺序，改动 imports 就可能悄悄失效。
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
