import { Logger } from '@nestjs/common';
import type { ClsService } from 'nestjs-cls';

import type { AppClsStore } from '../common/context/request-context.service';
import { DrizzleQueryLoggerService } from './query-logger';

/** 只需要 isActive/get 两个方法，不必搭出真的 CLS 上下文 */
function createCls(
  store: Partial<AppClsStore> | null,
): ClsService<AppClsStore> {
  const stub = {
    isActive: (): boolean => store !== null,
    get: (key: keyof AppClsStore): AppClsStore[keyof AppClsStore] =>
      store?.[key],
  };

  return stub as unknown as ClsService<AppClsStore>;
}

describe('DrizzleQueryLoggerService', () => {
  let debug: jest.SpyInstance<void, [message: unknown]>;

  beforeEach(() => {
    debug = jest.spyOn(
      Logger.prototype,
      'debug',
    ) as unknown as jest.SpyInstance<void, [message: unknown]>;
    debug.mockImplementation();
  });

  afterEach(() => {
    debug.mockRestore();
  });

  function lastMessage(): string {
    return String(debug.mock.calls.at(-1)?.[0]);
  }

  it('HTTP 请求的查询标注方法与路径', () => {
    const logger = new DrizzleQueryLoggerService(
      createCls({ method: 'GET', path: '/api/menus/mine' }),
    );

    logger.logQuery('select 1', []);

    expect(lastMessage()).toBe('[GET /api/menus/mine] select 1');
  });

  it('定时任务等无上下文入口标注为系统', () => {
    const logger = new DrizzleQueryLoggerService(createCls(null));

    logger.logQuery('select 1', []);

    expect(lastMessage()).toBe('[系统] select 1');
  });

  it('上下文缺少路径时不输出半截标签', () => {
    const logger = new DrizzleQueryLoggerService(createCls({ method: 'GET' }));

    logger.logQuery('select 1', []);

    expect(lastMessage()).toBe('[系统] select 1');
  });

  it('多行 SQL 压成单行并附上参数', () => {
    const logger = new DrizzleQueryLoggerService(createCls(null));

    logger.logQuery('select `id`\n  from `sys_user`\n  where `id` = ?', [7]);

    expect(lastMessage()).toBe(
      '[系统] select `id` from `sys_user` where `id` = ? -- params: 7',
    );
  });

  it('参数按类型序列化，不产生 [object Object]', () => {
    const logger = new DrizzleQueryLoggerService(createCls(null));

    logger.logQuery('insert', [
      null,
      new Date('2026-01-01T00:00:00.000Z'),
      { a: 1 },
      true,
    ]);

    expect(lastMessage()).toContain(
      '-- params: null, 2026-01-01T00:00:00.000Z, {"a":1}, true',
    );
  });

  it('超长 SQL 与参数被截断，避免刷屏', () => {
    const logger = new DrizzleQueryLoggerService(createCls(null));

    logger.logQuery('x'.repeat(400), ['y'.repeat(300)]);

    const message = lastMessage();

    expect(message).toContain(`${'x'.repeat(300)}…`);
    expect(message).toContain(`${'y'.repeat(200)}…`);
  });
});
