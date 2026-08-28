import type { OperationLogRow } from '@nest-admin/database';
import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import { LogCleanupService, type CleanupResult } from './log-cleanup.service';
import { OperationLog } from './operation-log.decorator';
import { OperationLogService } from './operation-log.service';

/**
 * 日志只读。不提供删除接口——能被随手删掉的审计日志没有审计价值，
 * 清理历史数据应当是运维层面的定时任务，不是后台的一个按钮。
 */
@ApiTags('操作日志')
@ApiBearerAuth()
@Controller('operation-logs')
export class OperationLogController {
  constructor(
    private readonly service: OperationLogService,
    private readonly cleanup: LogCleanupService,
  ) {}

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

  @Get('cleanup/preview')
  @Permissions(PERMISSIONS.LOG_CLEAN)
  @ApiOperation({
    summary: '预览本次清理会删掉多少行',
    description: '按 LOG_RETENTION_DAYS 计算，执行前可先看一眼规模',
  })
  previewCleanup(): Promise<CleanupResult> {
    return this.cleanup.countExpired();
  }

  @Post('cleanup')
  @Permissions(PERMISSIONS.LOG_CLEAN)
  @HttpCode(HttpStatus.OK)
  @OperationLog({ module: '操作日志', action: '手动清理' })
  @ApiOperation({
    summary: '立即执行一次清理',
    description:
      '与定时任务共用同一把 Redis 锁，不会和它撞在一起同时删。单次上限 10 万行，超出部分留到下一轮。',
  })
  runCleanup(): Promise<CleanupResult> {
    return this.cleanup.runManually();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.LOG_READ)
  @ApiOperation({ summary: '日志详情，含脱敏后的请求参数快照' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OperationLogRow> {
    return this.service.findById(id);
  }
}
