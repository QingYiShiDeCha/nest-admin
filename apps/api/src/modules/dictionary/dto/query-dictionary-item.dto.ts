import { STATUS, type Status } from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryDictionaryItemDto {
  @ApiPropertyOptional({ description: '按显示文本或业务值模糊搜索' })
  @IsString()
  @MaxLength(128)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
