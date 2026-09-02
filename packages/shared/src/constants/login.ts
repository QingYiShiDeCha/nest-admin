/** 登录日志结果。独立于操作日志，避免两个审计域互相耦合。 */
export const LOGIN_STATUS = ['success', 'failure'] as const;

export type LoginStatus = (typeof LOGIN_STATUS)[number];
