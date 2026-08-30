import type { NoticeRealtimeEvent } from '@nest-admin/shared';
import { Controller, Header, type MessageEvent, Sse } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { map, merge, type Observable, timer } from 'rxjs';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';
import { SkipOperationLog } from '../operation-log/operation-log.decorator';
import { NoticeEventService } from './notice-event.service';

const HEARTBEAT_INTERVAL_MS = 25_000;

@ApiTags('我的消息')
@ApiBearerAuth()
@Controller('messages')
export class MessageStreamController {
  constructor(private readonly events: NoticeEventService) {}

  @Sse('stream')
  @SkipResponseTransform()
  @SkipOperationLog()
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @ApiProduces('text/event-stream')
  @ApiOperation({ summary: '订阅当前用户的站内消息实时事件' })
  stream(@CurrentUser('id') userId: number): Observable<MessageEvent> {
    const messages = this.events.forUser(userId).pipe(map(toMessageEvent));
    const heartbeat = timer(0, HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({
        type: 'heartbeat',
        data: { occurredAt: new Date().toISOString() },
      })),
    );

    return merge(messages, heartbeat);
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
