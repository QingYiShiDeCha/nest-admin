import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @Length(8, 64)
  oldPassword: string;

  @ApiProperty({ description: '新密码，至少 8 位且需含字母和数字' })
  @IsString()
  @Length(8, 64, { message: '新密码长度需在 8-64 之间' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: '新密码必须同时包含字母和数字',
  })
  newPassword: string;
}
