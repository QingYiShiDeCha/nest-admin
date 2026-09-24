import type { NoticeRealtimeEvent } from '@nest-admin/shared';
import {
  Controller,
  Header,
  Headers,
  type MessageEvent,
  Sse,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { map, merge, type Observable, timer, from, concatMap } from 'rxjs';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';
import { SkipOperationLog } from '../operation-log/operation-log.decorator';
import { MessageService } from './message.service';
import { NoticeEventService } from './notice-event.service';

const HEARTBEAT_INTERVAL_MS = 25_000;

@ApiTags('我的消息')
@ApiBearerAuth()
@Controller('messages')
export class MessageStreamController {
  constructor(
    private readonly events: NoticeEventService,
    private readonly messages: MessageService,
  ) {}

  @Sse('stream')
  @SkipResponseTransform()
  @SkipOperationLog()
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary: '订阅当前用户的站内消息实时事件',
    description:
      '支持历史事件重放：重连时通过 Last-Event-ID 请求头传入上次接收的事件 ID，' +
      '服务端会先推送断线期间错过的历史事件，再继续实时推送新事件',
  })
  stream(
    @CurrentUser('id') userId: number,
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    const realtimeMessages = this.events
      .forUser(userId)
      .pipe(map(toMessageEvent));

    const heartbeat = timer(0, HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({
        type: 'heartbeat',
        data: { occurredAt: new Date().toISOString() },
      })),
    );

    // SSE 重连时，浏览器会自动发送 Last-Event-ID 请求头
    // 我们根据这个 ID 查询断线期间的历史事件并先推送
    if (lastEventId) {
      const historicalEvents = from(
        this.messages.findMissedEvents(userId, lastEventId),
      ).pipe(concatMap((events) => events.map(toMessageEvent)));

      // 先推送历史事件，再合并实时流和心跳
      return merge(historicalEvents, realtimeMessages, heartbeat);
    }

    return merge(realtimeMessages, heartbeat);
  }
}

function toMessageEvent(event: NoticeRealtimeEvent): MessageEvent {
  return {
    id: event.id,
    type: event.type,
    data: event,
    retry: 3_000,
  };
}
