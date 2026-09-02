import type { LoginLogRow } from '@nest-admin/database';
import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { QueryLoginLogDto } from './dto/query-login-log.dto';
import { LoginLogService } from './login-log.service';

@ApiTags('登录日志')
@ApiBearerAuth()
@Controller('login-logs')
export class LoginLogController {
  constructor(private readonly service: LoginLogService) {}

  @Get()
  @Permissions(PERMISSIONS.LOGIN_LOG_LIST)
  @ApiOperation({
    summary: '分页查询登录日志',
    description: '支持按用户名、登录结果和时间范围过滤，默认按时间倒序',
  })
  findPage(
    @Query() query: QueryLoginLogDto,
  ): Promise<PaginatedResult<LoginLogRow>> {
    return this.service.findPage(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.LOGIN_LOG_READ)
  @ApiOperation({ summary: '查看登录日志详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<LoginLogRow> {
    return this.service.findById(id);
  }
}
