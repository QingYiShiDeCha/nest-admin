import { STATUS, SYSTEM_CONFIG_VALUE_TYPE } from '@nest-admin/shared';
import {
  boolean,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

export const systemConfigs = mysqlTable(
  'sys_system_config',
  {
    id: primaryId(),
    name: varchar('name', { length: 64 }).notNull(),
    /** 稳定业务标识，软删除后仍不可复用。 */
    key: varchar('config_key', { length: 128 }).notNull(),
    value: text('config_value').notNull(),
    valueType: mysqlEnum('value_type', SYSTEM_CONFIG_VALUE_TYPE)
      .notNull()
      .default('string'),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    /** 内置参数允许改值，但不允许改键或删除。 */
    builtIn: boolean('built_in').notNull().default(false),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_system_config_key').on(table.key),
    index('idx_sys_system_config_status').on(table.status),
    index('idx_sys_system_config_value_type').on(table.valueType),
  ],
);

export type SystemConfigRow = typeof systemConfigs.$inferSelect;
export type NewSystemConfigRow = typeof systemConfigs.$inferInsert;
