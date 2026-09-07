/**
 * 登录日志结果。独立于操作日志，避免两个审计域互相耦合。
 *
 * `locked` 表示这次登录请求因为账号已处于锁定态被直接拒绝——
 * 与 `failure` 区分以便运维快速统计被锁定拦截的尝试。
 */
export const LOGIN_STATUS = ['success', 'failure', 'locked'] as const;

export type LoginStatus = (typeof LOGIN_STATUS)[number];
