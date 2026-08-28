import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '登录账号', example: 'admin' })
  @IsString()
  @Length(3, 32)
  username: string;

  @ApiProperty({ description: '密码', example: 'admin123456' })
  @IsString()
  @Length(8, 64)
  password: string;
}
