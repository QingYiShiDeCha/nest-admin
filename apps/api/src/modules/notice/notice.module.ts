import { Module } from '@nestjs/common';

import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageStreamController } from './message-stream.controller';
import { NoticeEventService } from './notice-event.service';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';

@Module({
  controllers: [NoticeController, MessageStreamController, MessageController],
  providers: [NoticeEventService, NoticeService, MessageService],
})
export class NoticeModule {}
