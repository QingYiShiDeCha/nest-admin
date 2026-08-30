import type { NoticeTargetType } from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const SELECTABLE_NOTICE_TARGET_TYPES = [
  'department',
  'role',
  'user',
] as const satisfies readonly NoticeTargetType[];

export class QueryNoticeTargetDto {
  @ApiProperty({ enum: SELECTABLE_NOTICE_TARGET_TYPES })
  @IsIn(SELECTABLE_NOTICE_TARGET_TYPES)
  targetType: (typeof SELECTABLE_NOTICE_TARGET_TYPES)[number];

  @ApiPropertyOptional({ description: '用户、角色或部门名称搜索' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  keyword?: string;
}
