/** 命中这些键名的值会被替换掉，不写进日志 */
const SENSITIVE_KEY = /password|token|secret|authorization|cookie|credential/i;

const REDACTED = '***';

/** 递归深度上限，超出后整棵子树换成占位符 */
const MAX_DEPTH = 6;

/** 单条日志的参数快照上限，避免一次大批量提交把 TEXT 列撑爆 */
const MAX_LENGTH = 2000;

/**
 * 递归脱敏。日志里绝不能出现明文密码和 token——
 * 登录失败的请求同样会被记录，而它的 body 里正好有密码。
 */
function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // 原来这一条排在最前面，超深时连标量一起原样返回，且整棵子树跳过脱敏，
  // 第 7 层往里的 password 键会明文入库。挪到类型判断之后，深度限制只牺牲细节不再漏敏感值。
  if (depth > MAX_DEPTH) {
    return '[嵌套过深，已省略]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(val, depth + 1),
    ]),
  );
}

/**
 * 把请求参数序列化成可入库的字符串。
 * 任何异常都吞掉返回 null——日志失败不该影响主流程。
 */
export function serializeParams(payload: unknown): string | null {
  try {
    const safe = redact(payload);
    const json = JSON.stringify(safe);

    if (!json || json === '{}') {
      return null;
    }

    return json.length > MAX_LENGTH
      ? `${json.slice(0, MAX_LENGTH)}...(已截断)`
      : json;
  } catch {
    return null;
  }
}
