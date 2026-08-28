import type { DrizzleDB, MysqlPool } from '@nest-admin/database';

/** 注入 Drizzle 实例用的 token */
export const DRIZZLE = 'DRIZZLE_ORM';

/** 注入底层连接池用的 token，仅在需要手动拿连接时使用 */
export const MYSQL_POOL = 'MYSQL_POOL';

/** DatabaseModule 内部用，把连接池和 db 一次性建出来 */
export const DATABASE_CLIENT = 'DATABASE_CLIENT';

// 业务代码从这里取类型即可，不必都去 import @nest-admin/database
export type { DrizzleDB, MysqlPool };
