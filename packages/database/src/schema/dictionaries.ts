import { DICTIONARY_TONE, STATUS } from '@nest-admin/shared';
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, foreignId, primaryId } from './columns';

export const dictionaryTypes = mysqlTable(
  'sys_dict_type',
  {
    id: primaryId(),
    name: varchar('name', { length: 64 }).notNull(),
    /** 稳定业务标识，软删除后仍不可复用。 */
    code: varchar('code', { length: 64 }).notNull(),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_dict_type_code').on(table.code),
    index('idx_sys_dict_type_status').on(table.status),
  ],
);

export const dictionaryItems = mysqlTable(
  'sys_dict_item',
  {
    id: primaryId(),
    typeId: foreignId('type_id')
      .notNull()
      .references(() => dictionaryTypes.id, { onDelete: 'restrict' }),
    label: varchar('label', { length: 64 }).notNull(),
    /** 同一字典类型内的稳定业务值，软删除后仍不可复用。 */
    value: varchar('value', { length: 128 }).notNull(),
    tone: mysqlEnum('tone', DICTIONARY_TONE),
    sort: int('sort').notNull().default(0),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_dict_item_type_value').on(table.typeId, table.value),
    index('idx_sys_dict_item_type_status_sort').on(
      table.typeId,
      table.status,
      table.sort,
    ),
  ],
);

export type DictionaryTypeRow = typeof dictionaryTypes.$inferSelect;
export type NewDictionaryTypeRow = typeof dictionaryTypes.$inferInsert;
export type DictionaryItemRow = typeof dictionaryItems.$inferSelect;
export type NewDictionaryItemRow = typeof dictionaryItems.$inferInsert;
