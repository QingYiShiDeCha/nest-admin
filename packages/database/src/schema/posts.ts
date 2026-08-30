import { STATUS } from '@nest-admin/shared';
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

export const posts = mysqlTable(
  'sys_post',
  {
    id: primaryId(),
    /** 稳定业务标识，软删除后不允许复用。 */
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    sort: int('sort').notNull().default(0),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_post_code').on(table.code),
    index('idx_sys_post_status').on(table.status),
  ],
);

export type PostRow = typeof posts.$inferSelect;
export type NewPostRow = typeof posts.$inferInsert;
