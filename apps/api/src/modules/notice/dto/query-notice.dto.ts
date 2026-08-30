import {
  NOTICE_PRIORITY,
  NOTICE_STATUS,
  NOTICE_TYPE,
  type NoticePriority,
  type NoticeStatus,
  type NoticeType,
} from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryNoticeDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按标题搜索' })
  @IsString()
  @MaxLength(128)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ enum: NOTICE_STATUS })
  @IsEnum(NOTICE_STATUS)
  @IsOptional()
  status?: NoticeStatus;

  @ApiPropertyOptional({ enum: NOTICE_TYPE })
  @IsEnum(NOTICE_TYPE)
  @IsOptional()
  type?: NoticeType;

  @ApiPropertyOptional({ enum: NOTICE_PRIORITY })
  @IsEnum(NOTICE_PRIORITY)
  @IsOptional()
  priority?: NoticePriority;
}
