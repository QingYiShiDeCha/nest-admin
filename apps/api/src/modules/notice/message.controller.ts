import type { NoticeUnreadCount, PaginatedResult } from '@nest-admin/shared';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipOperationLog } from '../operation-log/operation-log.decorator';
import { QueryMessageDto } from './dto/query-message.dto';
import { MessageService, type NoticeMessageRecord } from './message.service';

@ApiTags('我的消息')
@ApiBearerAuth()
@Controller('messages')
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Get()
  @ApiOperation({ summary: '分页查询当前用户收到的公告' })
  findPage(
    @CurrentUser('id') userId: number,
    @Query() query: QueryMessageDto,
  ): Promise<PaginatedResult<NoticeMessageRecord>> {
    return this.service.findPage(userId, query);
  }

  @Get('recent')
  @ApiOperation({ summary: '查询 Header 展示的最近五条消息' })
  findRecent(
    @CurrentUser('id') userId: number,
  ): Promise<NoticeMessageRecord[]> {
    return this.service.findRecent(userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '查询当前用户未读消息数' })
  unreadCount(@CurrentUser('id') userId: number): Promise<NoticeUnreadCount> {
    return this.service.unreadCount(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询当前用户的一条消息' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<NoticeMessageRecord> {
    return this.service.findDetail(id, userId);
  }

  @Patch('read-all')
  @SkipOperationLog()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '把当前用户全部消息标记为已读' })
  markAllRead(@CurrentUser('id') userId: number): Promise<void> {
    return this.service.markAllRead(userId);
  }

  @Patch(':id/read')
  @SkipOperationLog()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '把一条消息标记为已读' })
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<void> {
    return this.service.markRead(id, userId);
  }
}
