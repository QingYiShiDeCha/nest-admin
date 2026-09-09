import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class OAuthExchangeDto {
  @ApiProperty({ description: 'OAuth 回调产生的一次性 ticket' })
  @IsString()
  @Length(20, 200)
  ticket: string;
}
