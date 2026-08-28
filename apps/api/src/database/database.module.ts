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

import type { Env } from '../config/env.validation';
import {
  DATABASE_CLIENT,
  DRIZZLE,
  MYSQL_POOL,
  type MysqlPool,
} from './database.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): DatabaseClient =>
        createDatabaseClient({
          host: config.get('DB_HOST', { infer: true }),
          port: config.get('DB_PORT', { infer: true }),
          user: config.get('DB_USER', { infer: true }),
          password: config.get('DB_PASSWORD', { infer: true }),
          database: config.get('DB_NAME', { infer: true }),
          connectionLimit: config.get('DB_POOL_LIMIT', { infer: true }),
          logger: config.get('NODE_ENV', { infer: true }) === 'development',
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
