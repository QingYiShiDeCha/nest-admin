import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryOnlineUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按用户名或昵称模糊搜索' })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按登录 IP 模糊搜索' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  ip?: string;
}
