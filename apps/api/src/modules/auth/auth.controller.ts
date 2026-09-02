import { LOGIN_THROTTLE } from '@nest-admin/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  OperationLog,
  SkipOperationLog,
} from '../operation-log/operation-log.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionVo } from './dto/session.vo';
import type { AuthUser } from './interfaces/auth-user.interface';
import type {
  AuthResult,
  AuthTokens,
} from './interfaces/jwt-payload.interface';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('register')
  @OperationLog({ module: '认证', action: '注册' })
  @ApiOperation({
    summary: '注册并直接返回登录态',
    description: `限流：每 IP ${LOGIN_THROTTLE.ttl / 1000} 秒内最多 ${LOGIN_THROTTLE.limit} 次`,
  })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('login')
  @SkipOperationLog()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '账号密码登录',
    description: `限流：每 IP ${LOGIN_THROTTLE.ttl / 1000} 秒内最多 ${LOGIN_THROTTLE.limit} 次，超出返回 429`,
  })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @OperationLog({ module: '认证', action: '刷新令牌' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用 refreshToken 换取新的 token 对' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @OperationLog({ module: '认证', action: '登出' })
  @ApiOperation({
    summary: '登出，删除本次提交的 refreshToken 会话',
    description:
      '只影响当前这一个会话，其他设备不受影响。删除后对应 accessToken 也无法继续访问。令牌本身无效时同样返回 204。',
  })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '我的登录设备列表',
    description:
      '只列出未吊销且未过期的会话，当前设备排在最前并带 current: true。任何登录用户都能查自己的，不需要额外权限。',
  })
  listSessions(@CurrentUser() user: AuthUser): Promise<SessionVo[]> {
    return this.authService.listSessions(user.id, user.sessionId);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @OperationLog({ module: '认证', action: '下线指定设备' })
  @ApiOperation({
    summary: '下线指定设备',
    description:
      '只能下线自己的会话，别人的一律返回 404——不区分「不是你的」和「不存在」，避免成为探测他人会话 id 的接口。',
  })
  revokeSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.authService.revokeSession(id, user.id);
  }

  @Post('sessions/revoke-others')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @OperationLog({ module: '认证', action: '下线其他设备' })
  @ApiOperation({
    summary: '下线除当前设备外的全部会话',
    description: '发现异常登录时的自救操作，当前设备保持在线',
  })
  revokeOtherSessions(
    @CurrentUser() user: AuthUser,
  ): Promise<{ revokedSessions: number }> {
    return this.authService.revokeOtherSessions(user.id, user.sessionId);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取当前登录用户信息，含角色码与权限码',
    description:
      '前端登录后调用一次，用 permissions 做按钮级控制。isSuperAdmin 为 true 时后端跳过权限比对，前端也应视为拥有全部权限。',
  })
  profile(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
