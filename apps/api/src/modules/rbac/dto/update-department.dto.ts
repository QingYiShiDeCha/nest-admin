import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

import { CreateDepartmentDto } from './create-department.dto';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional({
    description: '变更上级部门时必填，最多 255 个字符',
    example: '组织架构调整，研发中心并入技术委员会',
  })
  @IsString()
  @Length(1, 255)
  @IsOptional()
  moveReason?: string;
}
