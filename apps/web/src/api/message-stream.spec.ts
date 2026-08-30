import { describe, expect, it } from 'vitest';

import { parseNoticeRealtimeEvent } from '@/api/message-stream';

describe('parseNoticeRealtimeEvent', () => {
  it('解析受支持的业务事件', () => {
    const event = {
      id: 'event-1',
      type: 'message.created',
      occurredAt: '2026-08-30T00:00:00.000Z',
      noticeId: 5,
    };

    expect(
      parseNoticeRealtimeEvent({
        event: event.type,
        id: event.id,
        data: JSON.stringify(event),
      }),
    ).toEqual(event);
  });

  it('忽略心跳和不可信的数据帧', () => {
    expect(
      parseNoticeRealtimeEvent({ event: 'heartbeat', id: '', data: '{}' }),
    ).toBeNull();
    expect(
      parseNoticeRealtimeEvent({
        event: 'message.created',
        id: 'event-1',
        data: JSON.stringify({
          id: 'different-id',
          type: 'message.created',
          occurredAt: '2026-08-30T00:00:00.000Z',
        }),
      }),
    ).toBeNull();
  });
});
