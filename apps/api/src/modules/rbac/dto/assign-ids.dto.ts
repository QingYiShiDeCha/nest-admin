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
 * 授权类接口统一采用「全量替换」语义：传入的集合就是最终结果，
 * 不传的即为撤销。比增量的 add/remove 少一半接口，也不会因为前端漏发
 * 某一项而产生「以为撤销了其实没撤销」的偏差。
 */
export class AssignIdsDto {
  @ApiProperty({
    description: '目标 id 集合，空数组表示清空全部授权',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayUnique({ message: 'id 不能重复' })
  @ArrayMaxSize(500, { message: '单次最多提交 500 项' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'id 必须是整数' })
  @Min(1, { each: true })
  ids: number[];
}
