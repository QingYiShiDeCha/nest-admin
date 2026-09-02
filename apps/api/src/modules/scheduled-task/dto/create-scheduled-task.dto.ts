import {
  DEFAULT_SCHEDULED_TASK_TIMEZONE,
  STATUS,
  type Status,
} from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateScheduledTaskDto {
  @ApiProperty({ description: '计划名称', example: '每日日志清理' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty({
    description: '后端预注册任务键',
    example: 'system.log.cleanup',
  })
  @IsString()
  @Length(3, 128)
  @Matches(/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/, {
    message: '任务键使用小写字母、数字、下划线或连字符，并以点号分段',
  })
  taskKey: string;

  @ApiProperty({ description: 'Cron 表达式', example: '0 3 * * *' })
  @IsString()
  @Length(5, 64)
  cronExpression: string;

  @ApiPropertyOptional({
    description: 'IANA 时区',
    default: DEFAULT_SCHEDULED_TASK_TIMEZONE,
  })
  @IsString()
  @Length(1, 64)
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: '状态', enum: STATUS, default: 'active' })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  remark?: string;
}
