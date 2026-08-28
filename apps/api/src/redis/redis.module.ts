import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import type { Env } from '../config/env.validation';

/** 注入 Redis 客户端。未配置 REDIS_URL 时注入的是 null，调用方必须判空 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

export type RedisClient = Redis | null;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): RedisClient => {
        const url = config.get('REDIS_URL', { infer: true });

        if (!url) {
          return null;
        }

        const logger = new Logger('Redis');

        const client = new Redis(url, {
          // 启动时连不上不要卡住整个应用：后台重连，业务侧按 fail-open 处理
          lazyConnect: false,
          maxRetriesPerRequest: 2,
          retryStrategy: (times) => Math.min(times * 200, 5000),
        });

        client.on('error', (error: Error) => {
          // ioredis 会自行重连，这里只记录，不能抛——未处理的 error 事件会让进程退出
          logger.error(`Redis 连接异常：${error.message}`);
        });
        client.on('ready', () => logger.log('Redis 已连接'));

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient) {}

  async onApplicationShutdown(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.quit();
    this.logger.log('Redis 连接已关闭');
  }
}
