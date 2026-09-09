import {
  PERMISSIONS,
  type OAuthProvider,
  type OAuthProviderPayload,
  type PaginatedResult,
} from '@nest-admin/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { CreateOAuthProviderDto } from './dto/create-oauth-provider.dto';
import { UpdateOAuthProviderDto } from './dto/update-oauth-provider.dto';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth 管理')
@ApiBearerAuth()
@Controller('oauth/providers')
export class OAuthProviderController {
  constructor(private readonly oauth: OAuthService) {}

  @Get()
  @Permissions(PERMISSIONS.OAUTH_PROVIDER_LIST)
  @ApiOperation({ summary: '分页查询 OAuth 提供商' })
  findPage(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<PaginatedResult<OAuthProvider>> {
    return this.oauth.findPage(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.OAUTH_PROVIDER_READ)
  @ApiOperation({ summary: '查询 OAuth 提供商详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OAuthProvider> {
    return this.oauth.findDetail(id);
  }

  @Post()
  @Permissions(PERMISSIONS.OAUTH_PROVIDER_CREATE)
  @OperationLog({ module: 'OAuth 管理', action: '新增提供商' })
  @ApiOperation({ summary: '新增 OAuth 提供商' })
  create(@Body() dto: CreateOAuthProviderDto): Promise<OAuthProvider> {
    return this.oauth.create(dto satisfies OAuthProviderPayload);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.OAUTH_PROVIDER_UPDATE)
  @OperationLog({ module: 'OAuth 管理', action: '更新提供商' })
  @ApiOperation({ summary: '更新 OAuth 提供商' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOAuthProviderDto,
  ): Promise<OAuthProvider> {
    return this.oauth.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.OAUTH_PROVIDER_DELETE)
  @OperationLog({ module: 'OAuth 管理', action: '删除提供商' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 OAuth 提供商' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.oauth.remove(id);
  }
}
