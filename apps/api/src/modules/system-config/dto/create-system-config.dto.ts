import {
  STATUS,
  SYSTEM_CONFIG_VALUE_TYPE,
  type Status,
  type SystemConfigValueType,
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

export class CreateSystemConfigDto {
  @ApiProperty({ description: '参数名称', example: '系统名称' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty({ description: '参数键', example: 'system.name' })
  @IsString()
  @Length(3, 128)
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, {
    message: '参数键使用小写字母、数字和下划线，并以点号分段',
  })
  key: string;

  @ApiProperty({ description: '参数值', example: 'Nest Admin' })
  @IsString()
  @MaxLength(10_000)
  value: string;

  @ApiPropertyOptional({
    description: '值类型',
    enum: SYSTEM_CONFIG_VALUE_TYPE,
    default: 'string',
  })
  @IsEnum(SYSTEM_CONFIG_VALUE_TYPE)
  @IsOptional()
  valueType?: SystemConfigValueType;

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
