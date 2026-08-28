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
  /** 打开后会把每条 SQL 打到 stdout，仅建议开发环境用 */
  logger?: boolean;
}

export interface DatabaseClient {
  pool: MysqlPool;
  db: DrizzleDB;
}
