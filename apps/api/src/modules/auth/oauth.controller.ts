import { OAUTH_PROVIDER_KEYS, type OAuthProviderKey } from '@nest-admin/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth 登录')
@Controller('auth/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private readonly oauth: OAuthService) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: '查询启用的 OAuth 登录提供商' })
  listEnabled() {
    return this.oauth.listEnabled();
  }

  @Public()
  @Get(':provider')
  @ApiOperation({ summary: '跳转到 OAuth 提供商授权页' })
  async authorize(
    @Param('provider') provider: string,
    @Res() response: Response,
  ): Promise<void> {
    const key = this.parseProvider(provider);
    response.redirect(await this.oauth.authorize(key));
  }

  @Public()
  @Get(':provider/callback')
  @ApiOperation({ summary: 'OAuth 授权回调' })
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const frontend = new URL(this.oauth.frontendCallbackUrl());
    try {
      if (!code || !state)
        throw new BadRequestException('OAuth 回调参数不完整');
      const ticket = await this.oauth.callback(
        this.parseProvider(provider),
        code,
        state,
      );
      frontend.searchParams.set('ticket', ticket);
    } catch (error) {
      // 只透传 service 里那些写给用户看的 HttpException 文案。
      // 其余异常（上游 fetch 的 TypeError、JSON.parse 的 SyntaxError、数据库错误）
      // 的 message 会随重定向落到浏览器历史、代理和服务端访问日志里，属于外泄面。
      const expected = error instanceof HttpException;

      if (!expected) {
        this.logger.error(
          `OAuth ${provider} 回调失败`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      frontend.searchParams.set(
        'error',
        expected ? error.message : 'OAuth 登录失败，请重试',
      );
    }
    response.redirect(frontend.toString());
  }

  @Public()
  @Post('exchange')
  @ApiOperation({ summary: '用 OAuth 一次性 ticket 换取系统登录态' })
  exchange(@Body() dto: OAuthExchangeDto) {
    return this.oauth.exchange(dto.ticket);
  }

  private parseProvider(value: string): OAuthProviderKey {
    if ((OAUTH_PROVIDER_KEYS as readonly string[]).includes(value)) {
      return value as OAuthProviderKey;
    }
    throw new BadRequestException('不支持的 OAuth 提供商');
  }
}
