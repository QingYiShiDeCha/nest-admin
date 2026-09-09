import { OAUTH_PROVIDER_KEYS, type OAuthProviderKey } from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOAuthProviderDto {
  @ApiProperty({ enum: OAUTH_PROVIDER_KEYS })
  @IsEnum(OAUTH_PROVIDER_KEYS)
  key: OAuthProviderKey;

  @ApiProperty({ description: '后台展示名称' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  clientId: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @Length(1, 10_000)
  clientSecret: string;

  @ApiPropertyOptional()
  @IsUrl({ require_tld: false })
  @IsOptional()
  authorizationUrl?: string;

  @ApiPropertyOptional()
  @IsUrl({ require_tld: false })
  @IsOptional()
  tokenUrl?: string;

  @ApiPropertyOptional()
  @IsUrl({ require_tld: false })
  @IsOptional()
  userInfoUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  autoRegister?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sort?: number;
}
