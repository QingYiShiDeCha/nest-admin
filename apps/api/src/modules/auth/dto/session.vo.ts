import { ApiProperty } from '@nestjs/swagger';

/**
 * 一个登录会话。刻意不返回 jti——它是会话的内部标识，
 * 对外只暴露数据库主键 id 用于下线操作，少一处不必要的信息外泄。
 */
export class SessionVo {
  @ApiProperty({ description: '会话 id，下线单个设备时用它' })
  id: number;

  @ApiProperty({ description: '登录时的 IP', nullable: true })
  ip: string | null;

  @ApiProperty({ description: '登录时的 User-Agent', nullable: true })
  userAgent: string | null;

  @ApiProperty({ description: '登录时间' })
  createdAt: Date;

  @ApiProperty({ description: '过期时间' })
  expiresAt: Date;

  @ApiProperty({
    description:
      '是否为当前正在使用的设备。用早期版本签发的 accessToken 访问时无法判定，一律为 false',
  })
  current: boolean;
}
