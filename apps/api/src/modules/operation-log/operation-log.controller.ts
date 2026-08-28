import type { OperationLogRow } from '@nest-admin/database';
import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import { OperationLogService } from './operation-log.service';

/**
 * 日志只读。不提供删除接口——能被随手删掉的审计日志没有审计价值，
 * 清理历史数据应当是运维层面的定时任务，不是后台的一个按钮。
 */
@ApiTags('操作日志')
@ApiBearerAuth()
@Controller('operation-logs')
export class OperationLogController {
  constructor(private readonly service: OperationLogService) {}

  @Get()
  @Permissions(PERMISSIONS.LOG_LIST)
  @ApiOperation({
    summary: '分页查询操作日志',
    description: '支持按用户名、模块、结果、时间范围过滤，默认按时间倒序',
  })
  findPage(
    @Query() query: QueryOperationLogDto,
  ): Promise<PaginatedResult<OperationLogRow>> {
    return this.service.findPage(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.LOG_READ)
  @ApiOperation({ summary: '日志详情，含脱敏后的请求参数快照' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OperationLogRow> {
    return this.service.findById(id);
  }
}
