import { workspaceEnvFiles } from '@nest-admin/shared/node';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, seconds } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { validateEnv, type Env } from './config/env.validation';
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
    // 只声明一个默认限流器，登录这类需要收紧的接口用 @Throttle 就地覆盖。
    // 声明多个具名限流器会让它们同时作用于所有路由，反而要到处 @SkipThrottle。
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            ttl: seconds(config.get('THROTTLE_TTL', { infer: true })),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    DatabaseModule,
    RbacModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 三个全局守卫都在这里注册，顺序即执行顺序，不能颠倒：
    // 1. 限流最先，未通过就不该消耗查库与 bcrypt 的开销
    // 2. JwtAuthGuard 认证并把 AuthUser 挂到 request 上
    // 3. PermissionGuard 依赖上一步的产物做权限码比对
    // 放在同一个 providers 数组是为了让顺序显式可见——
    // 分散到各自模块时，执行顺序取决于模块解析顺序，改动 imports 就可能悄悄失效。
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
