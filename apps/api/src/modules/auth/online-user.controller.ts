import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { QueryOnlineUserDto } from './dto/query-online-user.dto';
import type { AuthUser } from './interfaces/auth-user.interface';
import {
  type OnlineUserSessionRow,
  RefreshTokenService,
} from './refresh-token.service';

@ApiTags('在线用户')
@ApiBearerAuth()
@Controller('online-users')
export class OnlineUserController {
  constructor(private readonly refreshTokens: RefreshTokenService) {}

  @Get()
  @Permissions(PERMISSIONS.USER_SESSION_LIST)
  @ApiOperation({
    summary: '分页查询在线用户',
    description: '每个有效登录设备对应一行，支持按用户和 IP 搜索',
  })
  findPage(
    @Query() query: QueryOnlineUserDto,
    @CurrentUser() viewer: AuthUser,
  ): Promise<PaginatedResult<OnlineUserSessionRow>> {
    return this.refreshTokens.findOnlinePage(query, viewer.sessionId);
  }
}
