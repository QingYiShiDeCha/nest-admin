/**
 * 用户状态。放在 shared 而不是 database，
 * 是为了让前端或其他不依赖 Drizzle 的包也能拿到这份枚举。
 */
export const USER_STATUS = ['active', 'disabled'] as const;

export type UserStatus = (typeof USER_STATUS)[number];
