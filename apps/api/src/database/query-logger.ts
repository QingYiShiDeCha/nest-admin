import type { Logger as DrizzleQueryLogger } from 'drizzle-orm';
import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import type { AppClsStore } from '../common/context/request-context.service';

/** 超过这个长度的 SQL 会被截断——日志是用来定位来源的，不是用来复现执行计划的 */
const MAX_SQL_LENGTH = 300;
/** 参数同理，一次 insert 的 values 可能极长 */
const MAX_PARAMS_LENGTH = 200;

/**
 * Drizzle 自带的 DefaultLogger 只打 SQL 和参数，看不出这条查询是哪个接口发的，
 * 排查「这一屏日志到底谁在查」时基本没用。这里换成带请求来源的实现：
 * HTTP 请求标 `GET /api/menus/mine`，定时任务/启动期等无上下文的入口标 `[系统]`。
 *
 * CLS 是 AsyncLocalStorage，取值发生在查询实际执行的那一刻，
 * 因此天然落在发起该查询的请求上下文里，不需要手动传递。
 */
export class DrizzleQueryLoggerService implements DrizzleQueryLogger {
  private readonly logger = new Logger('SQL');

  constructor(private readonly cls: ClsService<AppClsStore>) {}

  logQuery(query: string, params: unknown[]): void {
    this.logger.debug(`${this.source()} ${compact(query)}${format(params)}`);
  }

  /**
   * 无上下文的调用方（定时任务、模块初始化）不是异常情况，
   * 标成 `[系统]` 比留空更容易在日志里区分。
   */
  private source(): string {
    if (!this.cls.isActive()) return '[系统]';

    const method = this.cls.get('method');
    const path = this.cls.get('path');

    return method && path ? `[${method} ${path}]` : '[系统]';
  }
}

/** 把 Drizzle 生成的多行缩进 SQL 压成单行，一条查询占一行才好扫 */
function compact(query: string): string {
  const text = query.replace(/\s+/g, ' ').trim();

  return truncate(text, MAX_SQL_LENGTH);
}

function format(params: unknown[]): string {
  if (params.length === 0) return '';

  const text = params.map(stringify).join(', ');

  return ` -- params: ${truncate(text, MAX_PARAMS_LENGTH)}`;
}

/** 参数可能是 Buffer、Date 或嵌套对象，逐类处理避免落到 `[object Object]` */
function stringify(param: unknown): string {
  if (param === null || param === undefined) return 'null';
  if (param instanceof Date) return param.toISOString();

  switch (typeof param) {
    case 'string':
      return param;
    case 'number':
    case 'boolean':
    case 'bigint':
      return param.toString();
    default:
      try {
        return JSON.stringify(param) ?? '[无法序列化]';
      } catch {
        return '[无法序列化]';
      }
  }
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
