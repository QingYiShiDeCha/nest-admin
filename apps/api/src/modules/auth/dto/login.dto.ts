import { PASSWORD_MIN_LENGTH_RANGE } from '@nest-admin/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '登录账号', example: 'admin' })
  @IsString()
  @Length(3, 32)
  username: string;

  // 与建号/改密用同一个硬边界：写死数字会让「最小长度配成 6」时建出的账号永远登不进来
  @ApiProperty({ description: '密码', example: 'admin123456' })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH_RANGE.min, PASSWORD_MIN_LENGTH_RANGE.max, {
    message: `密码长度需在 ${PASSWORD_MIN_LENGTH_RANGE.min}-${PASSWORD_MIN_LENGTH_RANGE.max} 之间`,
  })
  password: string;
}
