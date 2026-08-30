import {
  NOTICE_PRIORITY,
  NOTICE_TARGET_TYPE,
  NOTICE_TYPE,
  type NoticePriority,
  type NoticeTargetType,
  type NoticeType,
} from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ description: '标题', maxLength: 128 })
  @IsString()
  @Length(1, 128)
  title: string;

  @ApiProperty({ description: '正文，第一版按纯文本存储' })
  @IsString()
  @Length(1, 10_000)
  content: string;

  @ApiPropertyOptional({ enum: NOTICE_TYPE, default: 'notice' })
  @IsEnum(NOTICE_TYPE)
  @IsOptional()
  type?: NoticeType;

  @ApiPropertyOptional({ enum: NOTICE_PRIORITY, default: 'normal' })
  @IsEnum(NOTICE_PRIORITY)
  @IsOptional()
  priority?: NoticePriority;

  @ApiProperty({ enum: NOTICE_TARGET_TYPE, description: '接收范围类型' })
  @IsEnum(NOTICE_TARGET_TYPE)
  targetType: NoticeTargetType;

  @ApiPropertyOptional({
    description: '部门、角色或用户 id；全员发送时必须为空',
    type: [Number],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(2000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  targetIds?: number[];

  @ApiPropertyOptional({ description: '过期时间，null 表示永不过期' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string | null;
}
