import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({
    description: '头像地址，传 null 可恢复默认头像',
    nullable: true,
    example: '/uploads/2026/08/30/avatar.png',
  })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @Length(1, 255, { message: '头像地址长度需在 1-255 之间' })
  @Matches(/^(?:https?:\/\/|\/)[^\s]+$/i, {
    message: '头像地址格式不正确',
  })
  avatar!: string | null;
}
