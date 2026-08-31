import { STATUS, type Status } from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateDictionaryTypeDto {
  @ApiProperty({ description: '字典名称', example: '业务优先级' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty({ description: '字典编码', example: 'business.priority' })
  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, {
    message: '字典编码使用小写字母、数字和下划线，可用点号分段',
  })
  code: string;

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
