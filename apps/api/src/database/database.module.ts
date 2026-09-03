import {
  createDatabaseClient,
  type DatabaseClient,
} from '@nest-admin/database';
import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';

import type { AppClsStore } from '../common/context/request-context.service';
import type { Env } from '../config/env.validation';
import {
  DATABASE_CLIENT,
  DRIZZLE,
  MYSQL_POOL,
  type MysqlPool,
} from './database.constants';
import { DrizzleQueryLoggerService } from './query-logger';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CLIENT,
      inject: [ConfigService, ClsService],
      useFactory: (
        config: ConfigService<Env, true>,
        cls: ClsService<AppClsStore>,
      ): DatabaseClient =>
        createDatabaseClient({
          host: config.get('DB_HOST', { infer: true }),
          port: config.get('DB_PORT', { infer: true }),
          user: config.get('DB_USER', { infer: true }),
          password: config.get('DB_PASSWORD', { infer: true }),
          database: config.get('DB_NAME', { infer: true }),
          connectionLimit: config.get('DB_POOL_LIMIT', { infer: true }),
          // 开发环境打 SQL 并标注触发它的接口；生产环境完全关闭
          logger:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? new DrizzleQueryLoggerService(cls)
              : false,
        }),
    },
    {
      provide: MYSQL_POOL,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) => client.pool,
    },
    {
      provide: DRIZZLE,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) => client.db,
    },
  ],
  exports: [DRIZZLE, MYSQL_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(MYSQL_POOL) private readonly pool: MysqlPool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.log('MySQL 连接池已关闭');
  }
}
