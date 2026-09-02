import type { DrizzleDB } from '../../database/database.constants';
import type { RedisClient } from '../../redis/redis.constants';
import { SystemMonitorService } from './system-monitor.service';

describe('SystemMonitorService', () => {
  type SelectWhere = {
    where: (condition: unknown) => Promise<Array<{ total: number }>>;
  };
  type SelectBuilder = {
    from: (table: unknown) => SelectWhere;
  };

  function createDatabase(results: Array<Array<{ total: number }>>) {
    let selectCount = 0;
    const select = jest.fn<SelectBuilder, []>(() => {
      const result = results[selectCount] ?? [];
      selectCount += 1;
      const where = jest
        .fn<Promise<Array<{ total: number }>>, [unknown]>()
        .mockResolvedValue(result);
      return {
        from: () => ({ where }),
      };
    });
    const execute = jest
      .fn<Promise<unknown[]>, [unknown]>()
      .mockResolvedValue([]);

    return {
      db: {
        execute,
        select: select as unknown as DrizzleDB['select'],
      } as unknown as DrizzleDB,
      select,
      execute,
    };
  }

  it('Redis 未配置时返回正常数据库和主机快照', async () => {
    const { db: database } = createDatabase([
      [{ total: 3 }],
      [{ total: 5 }],
      [{ total: 2 }],
      [{ total: 1 }],
    ]);
    const service = new SystemMonitorService(database, null);

    const result = await service.overview();

    expect(result.services.database.status).toBe('up');
    expect(result.services.redis).toEqual({
      status: 'unconfigured',
      latencyMs: null,
    });
    expect(typeof result.services.database.latencyMs).toBe('number');
    expect(result.workload).toEqual({
      onlineSessions: 3,
      scheduledTasks: 5,
      activeScheduledTasks: 2,
      runningTaskExecutions: 1,
    });
    expect(result.process).toMatchObject({
      pid: process.pid,
      nodeVersion: process.version,
    });
    expect(result.history).toHaveLength(1);
  });

  it('依赖探测失败时保留主机信息并降级工作负载', async () => {
    const { db: database, execute, select } = createDatabase([]);
    execute.mockRejectedValue(new Error('database unavailable'));
    const redis = {
      ping: jest.fn().mockRejectedValue(new Error('redis unavailable')),
    } as unknown as RedisClient;
    const service = new SystemMonitorService(database, redis);

    const result = await service.overview();

    expect(result.services.database).toEqual({
      status: 'down',
      latencyMs: null,
    });
    expect(result.services.redis).toEqual({
      status: 'down',
      latencyMs: null,
    });
    expect(result.workload).toEqual({
      onlineSessions: null,
      scheduledTasks: null,
      activeScheduledTasks: null,
      runningTaskExecutions: null,
    });
    expect(select).not.toHaveBeenCalled();
  });

  it('连续采样只保留最近二十条趋势记录', async () => {
    const { db: database } = createDatabase([
      [{ total: 0 }],
      [{ total: 0 }],
      [{ total: 0 }],
      [{ total: 0 }],
    ]);
    const service = new SystemMonitorService(database, null);

    for (let index = 0; index < 25; index += 1) {
      await service.overview();
    }

    const result = await service.overview();
    expect(result.history).toHaveLength(20);
    expect(result.history.at(-1)?.timestamp).toBe(result.generatedAt);
  });
});
