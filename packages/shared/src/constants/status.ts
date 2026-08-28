/**
 * 通用启用/禁用状态。用户、角色、菜单共用一套，
 * 避免每张表各写一份内容相同的枚举。
 * 若某个领域将来需要额外状态（例如账号锁定），届时再为它单独拆一份。
 */
export const STATUS = ['active', 'disabled'] as const;

export type Status = (typeof STATUS)[number];
