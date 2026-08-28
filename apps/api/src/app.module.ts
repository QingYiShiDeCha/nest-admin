import { workspaceEnvFiles } from '@nest-admin/shared/node';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ClsModule } from 'nestjs-cls';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestContextModule } from './common/context/request-context.module';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { CurrentUserInterceptor } from './common/interceptors/current-user.interceptor';
import { validateEnv, type Env } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from './modules/rbac/guards/permission.guard';
import { OperationLogInterceptor } from './modules/operation-log/operation-log.interceptor';
import { OperationLogModule } from './modules/operation-log/operation-log.module';
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
    // 中间件负责建立 AsyncLocalStorage 上下文（此时还没认证，拿不到用户）；
    // 真正写入 userId 的是 CurrentUserInterceptor，它在守卫之后执行。
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    RequestContextModule,
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
    OperationLogModule,
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
    // 顺序同样重要：CurrentUserInterceptor 先把 userId 写进 CLS，
    // OperationLogInterceptor 再记录（它读的是 request.user，不依赖 CLS，
    // 但保持这个顺序能让后续从上下文取值的改动不出意外）。
    { provide: APP_INTERCEPTOR, useClass: CurrentUserInterceptor },
    { provide: APP_INTERCEPTOR, useClass: OperationLogInterceptor },
  ],
})
export class AppModule {}
