import { Module } from '@nestjs/common';

import { ScheduledTaskController } from './scheduled-task.controller';
import { ScheduledTaskRegistry } from './scheduled-task.registry';
import { ScheduledTaskService } from './scheduled-task.service';

@Module({
  controllers: [ScheduledTaskController],
  providers: [ScheduledTaskRegistry, ScheduledTaskService],
  exports: [ScheduledTaskService],
})
export class ScheduledTaskModule {}
