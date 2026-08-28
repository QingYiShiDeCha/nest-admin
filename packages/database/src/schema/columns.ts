import { bigint, timestamp } from 'drizzle-orm/mysql-core';

/**
 * 统一的主键列。所有业务表都用无符号 bigint 自增，
 * 关联列（如 role_id）必须与之类型一致，否则 MySQL 建外键会报错。
 */
export const primaryId = () =>
  bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey();

/** 指向某张表主键的外键列类型，保持与 primaryId 同宽 */
export const foreignId = (name: string) =>
  bigint(name, { mode: 'number', unsigned: true });

/**
 * 业务主表统一的审计字段。
 *
 * 写成函数而不是常量对象，是因为 Drizzle 的列构建器带内部状态，
 * 多张表共享同一个构建器实例会互相污染列定义。
 *
 * created_by / updated_by 目前可为空：填充它需要在请求上下文里拿到当前用户，
 * 等 RBAC 的 service 层接上之后再统一写入。
 */
export const auditColumns = () => ({
  createdBy: foreignId('created_by'),
  updatedBy: foreignId('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  /**
   * 非空表示已软删除。所有业务查询都必须带 isNull(deletedAt)，
   * 否则会把已删除数据一起捞出来。
   */
  deletedAt: timestamp('deleted_at'),
});

/**
 * 关联表的审计字段。关联表走硬删除（解绑就是真删行），
 * 所以没有 deleted_at，也不需要 updated_at——授权关系只有建立和撤销两种状态。
 */
export const grantColumns = () => ({
  createdBy: foreignId('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
