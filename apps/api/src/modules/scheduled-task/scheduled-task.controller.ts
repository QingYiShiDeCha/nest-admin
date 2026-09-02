import {
  PERMISSIONS,
  type PaginatedResult,
  type ScheduledTaskDefinition,
} from '@nest-admin/shared';
import type { ScheduledTaskLogRow } from '@nest-admin/database';
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
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import {
  QueryScheduledTaskDto,
  QueryScheduledTaskLogDto,
} from './dto/query-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import {
  ScheduledTaskService,
  type ScheduledTaskRecord,
} from './scheduled-task.service';

@ApiTags('定时任务')
@ApiBearerAuth()
@Controller('scheduled-tasks')
export class ScheduledTaskController {
  constructor(private readonly service: ScheduledTaskService) {}

  @Get()
  @Permissions(PERMISSIONS.SCHEDULED_TASK_LIST)
  @ApiOperation({ summary: '分页查询定时任务' })
  findPage(
    @Query() query: QueryScheduledTaskDto,
  ): Promise<PaginatedResult<ScheduledTaskRecord>> {
    return this.service.findPage(query);
  }

  @Get('definitions')
  @Permissions(PERMISSIONS.SCHEDULED_TASK_READ)
  @ApiOperation({ summary: '查询可用的预注册任务处理器' })
  definitions(): ScheduledTaskDefinition[] {
    return this.service.definitions();
  }

  @Post()
  @Permissions(PERMISSIONS.SCHEDULED_TASK_CREATE)
  @OperationLog({ module: '定时任务', action: '新增计划' })
  @ApiOperation({ summary: '新增定时计划' })
  create(@Body() dto: CreateScheduledTaskDto): Promise<ScheduledTaskRecord> {
    return this.service.create(dto);
  }

  @Get(':id/logs')
  @Permissions(PERMISSIONS.SCHEDULED_TASK_LOG_LIST)
  @ApiOperation({ summary: '分页查询任务执行日志' })
  findLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryScheduledTaskLogDto,
  ): Promise<PaginatedResult<ScheduledTaskLogRow>> {
    return this.service.findLogs(id, query);
  }

  @Post(':id/run')
  @Permissions(PERMISSIONS.SCHEDULED_TASK_RUN)
  @OperationLog({ module: '定时任务', action: '手动执行' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '立即执行一次任务' })
  run(@Param('id', ParseIntPipe) id: number): Promise<ScheduledTaskLogRow> {
    return this.service.runManually(id);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SCHEDULED_TASK_READ)
  @ApiOperation({ summary: '查询定时任务详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ScheduledTaskRecord> {
    return this.service.findDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.SCHEDULED_TASK_UPDATE)
  @OperationLog({ module: '定时任务', action: '更新计划' })
  @ApiOperation({ summary: '更新定时计划或启停状态' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduledTaskDto,
  ): Promise<ScheduledTaskRecord> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.SCHEDULED_TASK_DELETE)
  @OperationLog({ module: '定时任务', action: '删除计划' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除非内置定时计划' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
