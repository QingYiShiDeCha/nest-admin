import {
  DICTIONARY_TONE,
  STATUS,
  type DictionaryTone,
  type Status,
} from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDictionaryItemDto {
  @ApiProperty({ description: '显示文本', example: '高' })
  @IsString()
  @Length(1, 64)
  label: string;

  @ApiProperty({ description: '业务值', example: 'high' })
  @IsString()
  @Length(1, 128)
  value: string;

  @ApiPropertyOptional({ description: '语义色', enum: DICTIONARY_TONE })
  @IsEnum(DICTIONARY_TONE)
  @IsOptional()
  tone?: DictionaryTone | null;

  @ApiPropertyOptional({ description: '排序值，升序', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  @IsOptional()
  sort?: number;

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
