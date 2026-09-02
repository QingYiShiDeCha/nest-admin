import { FILE_CATEGORY, FILE_STORAGE_DRIVER } from '@nest-admin/shared';
import {
  bigint,
  index,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';

export const fileResources = mysqlTable(
  'sys_file_resource',
  {
    id: primaryId(),
    key: varchar('object_key', { length: 512 }).notNull(),
    url: varchar('url', { length: 1024 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    extension: varchar('extension', { length: 32 }),
    category: mysqlEnum('category', FILE_CATEGORY).notNull(),
    size: bigint('size', { mode: 'number', unsigned: true }).notNull(),
    storage: mysqlEnum('storage', FILE_STORAGE_DRIVER).notNull(),
    uploaderId: foreignId('uploader_id'),
    uploaderUsername: varchar('uploader_username', { length: 32 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('uk_sys_file_resource_key').on(table.key),
    index('idx_sys_file_resource_category').on(table.category),
    index('idx_sys_file_resource_storage').on(table.storage),
    index('idx_sys_file_resource_uploader_id').on(table.uploaderId),
    index('idx_sys_file_resource_created_at').on(table.createdAt),
  ],
);

export type FileResourceRow = typeof fileResources.$inferSelect;
export type NewFileResourceRow = typeof fileResources.$inferInsert;
