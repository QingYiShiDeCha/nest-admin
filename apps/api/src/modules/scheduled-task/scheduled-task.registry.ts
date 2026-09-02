import { Injectable, NotFoundException } from '@nestjs/common';
import type { ScheduledTaskDefinition } from '@nest-admin/shared';

import { LogCleanupService } from '../operation-log/log-cleanup.service';

export interface RegisteredScheduledTask {
  key: string;
  name: string;
  description: string;
  execute: () => Promise<unknown>;
}

@Injectable()
export class ScheduledTaskRegistry {
  private readonly tasks: ReadonlyMap<string, RegisteredScheduledTask>;

  constructor(logCleanup: LogCleanupService) {
    const entries: RegisteredScheduledTask[] = [
      {
        key: 'system.log.cleanup',
        name: '日志与过期会话清理',
        description: '按系统保留天数分批清理登录日志、操作日志和失效会话',
        execute: () => logCleanup.runManually(),
      },
    ];

    this.tasks = new Map(entries.map((task) => [task.key, task]));
  }

  list(): ScheduledTaskDefinition[] {
    return [...this.tasks.values()].map(({ key, name, description }) => ({
      key,
      name,
      description,
    }));
  }

  has(key: string): boolean {
    return this.tasks.has(key);
  }

  execute(key: string): Promise<unknown> {
    const task = this.tasks.get(key);
    if (!task) {
      throw new NotFoundException(`任务处理器 ${key} 未注册`);
    }

    return task.execute();
  }
}
