import { drizzle } from 'drizzle-orm/mysql2';
import { createPool } from 'mysql2/promise';

import * as schema from './schema';
import type { DatabaseClient, DatabaseClientOptions } from './types';

/**
 * 建连接池并包上 Drizzle。api 的 DatabaseModule 和 seed 脚本都走这里，
 * 保证两边的连接参数（时区、字符集、大数处理）完全一致。
 */
export function createDatabaseClient(
  options: DatabaseClientOptions,
): DatabaseClient {
  const pool = createPool({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    connectionLimit: options.connectionLimit ?? 10,
    waitForConnections: true,
    // 让 DATETIME/TIMESTAMP 回来时是 Date 而不是字符串，Drizzle 的推断类型依赖这一点
    dateStrings: false,
    timezone: 'Z',
    charset: 'utf8mb4_general_ci',
    supportBigNumbers: true,
  });

  return {
    pool,
    db: drizzle(pool, {
      schema,
      mode: 'default',
      logger: options.logger ?? false,
    }),
  };
}
