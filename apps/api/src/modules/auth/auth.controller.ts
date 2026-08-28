import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
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
  @Post('register')
  @ApiOperation({ summary: '注册并直接返回登录态' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '账号密码登录' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用 refreshToken 换取新的 token 对' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken);
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
