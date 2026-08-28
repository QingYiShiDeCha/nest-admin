import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from './database/database.constants';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  uptime: number;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async health(): Promise<HealthStatus> {
    let database: HealthStatus['database'] = 'up';

    try {
      await this.db.execute(sql`select 1`);
    } catch (error) {
      database = 'down';
      this.logger.error(
        '健康检查探测数据库失败',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptime: Math.floor(process.uptime()),
    };
  }
}
