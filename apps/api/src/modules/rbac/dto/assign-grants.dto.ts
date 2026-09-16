import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

/**
 * 角色授权（权限码 + 菜单）的全量替换入参。
 *
 * 两个集合都必须显式传入：授权的语义是「界面上最终的勾选状态」，
 * 允许省略其中一个就分不清「清空菜单」和「没动菜单」。
 *
 * 两个字段的校验规则与 AssignIdsDto 保持一致——同一个界面提交的两类 id，
 * 一个限 500 一个不限，只会变成新的坑。
 */
export class AssignGrantsDto {
  @ApiProperty({
    description: '权限码 id 集合，空数组表示清空全部权限',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayUnique({ message: '权限码 id 不能重复' })
  @ArrayMaxSize(500, { message: '单次最多提交 500 项' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'id 必须是整数' })
  @Min(1, { each: true })
  permissionIds: number[];

  @ApiProperty({
    description: '菜单 id 集合，空数组表示清空全部菜单',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayUnique({ message: '菜单 id 不能重复' })
  @ArrayMaxSize(500, { message: '单次最多提交 500 项' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'id 必须是整数' })
  @Min(1, { each: true })
  menuIds: number[];
}
