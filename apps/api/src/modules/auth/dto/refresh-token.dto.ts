import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '登录时下发的 refreshToken' })
  @IsJWT({ message: 'refreshToken 格式不正确' })
  refreshToken: string;
}
