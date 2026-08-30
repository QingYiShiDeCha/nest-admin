import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const MESSAGE_READ_STATUS = ['all', 'read', 'unread'] as const;
export type MessageReadStatus = (typeof MESSAGE_READ_STATUS)[number];

export class QueryMessageDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MESSAGE_READ_STATUS, default: 'all' })
  @IsIn(MESSAGE_READ_STATUS)
  @IsOptional()
  readStatus: MessageReadStatus = 'all';
}
