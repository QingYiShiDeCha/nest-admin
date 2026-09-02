import {
  SCHEDULED_TASK_EXECUTION_STATUS,
  SCHEDULED_TASK_TRIGGER_TYPE,
  STATUS,
  type ScheduledTaskExecutionStatus,
  type ScheduledTaskTriggerType,
  type Status,
} from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryScheduledTaskDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按计划名称或任务键模糊搜索' })
  @IsString()
  @MaxLength(128)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}

export class QueryScheduledTaskLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '按执行状态过滤',
    enum: SCHEDULED_TASK_EXECUTION_STATUS,
  })
  @IsEnum(SCHEDULED_TASK_EXECUTION_STATUS)
  @IsOptional()
  status?: ScheduledTaskExecutionStatus;

  @ApiPropertyOptional({
    description: '按触发方式过滤',
    enum: SCHEDULED_TASK_TRIGGER_TYPE,
  })
  @IsEnum(SCHEDULED_TASK_TRIGGER_TYPE)
  @IsOptional()
  triggerType?: ScheduledTaskTriggerType;
}
