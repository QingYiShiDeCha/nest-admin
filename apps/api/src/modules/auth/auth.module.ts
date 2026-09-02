import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { Env } from '../../config/env.validation';
import { UserModule } from '../user/user.module';
import { LoginLogModule } from '../login-log/login-log.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenModule } from './refresh-token.module';
import { UserSessionController } from './user-session.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OnlineUserController } from './online-user.controller';

@Module({
  imports: [
    UserModule,
    LoginLogModule,
    RefreshTokenModule,
    PassportModule,
    // 这里注册的是 accessToken 的默认签名配置，refreshToken 在 service 里单独传 secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController, OnlineUserController, UserSessionController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
