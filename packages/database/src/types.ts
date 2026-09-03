import type { Logger as DrizzleQueryLogger } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { Pool } from 'mysql2/promise';

import type * as schema from './schema';

/** 带完整 schema 类型的 Drizzle 实例，注入时用它标注即可获得表结构推断 */
export type DrizzleDB = MySql2Database<typeof schema>;

export type MysqlPool = Pool;

export interface DatabaseClientOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  /**
   * `true` 用 Drizzle 自带的 logger 把每条 SQL 打到 stdout，仅建议开发环境用。
   * 传实现了 `logQuery` 的对象可自定义输出（api 侧借此标注 SQL 由哪个请求触发）。
   */
  logger?: boolean | DrizzleQueryLogger;
}

export interface DatabaseClient {
  pool: MysqlPool;
  db: DrizzleDB;
}
