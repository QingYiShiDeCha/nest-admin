import { Test, type TestingModule } from '@nestjs/testing';

import { REDIS_CLIENT } from './redis.constants';
import { RedisLockService } from './redis-lock.service';

describe('RedisLockService', () => {
  const build = async (redis: unknown) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisLockService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();

    return module.get(RedisLockService);
  };

  it('没配 Redis 时直接执行，单实例部署不该被迫依赖 Redis', async () => {
    const service = await build(null);
    const task = jest.fn().mockResolvedValue('done');

    await expect(service.runExclusive('k', 1000, task)).resolves.toBe('done');
    expect(task).toHaveBeenCalled();
  });

  it('抢到锁才执行，并在结束后释放', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    const service = await build(redis);
    const task = jest.fn().mockResolvedValue('done');

    await service.runExclusive('k', 5000, task);

    expect(redis.set).toHaveBeenCalledWith(
      'lock:k',
      expect.any(String),
      'PX',
      5000,
      'NX',
    );
    expect(task).toHaveBeenCalled();
    expect(redis.eval).toHaveBeenCalled();
  });

  it('锁被别人持有时跳过而不是排队', async () => {
    // 定时任务错过一轮没关系，排队反而可能堆积
    const redis = { set: jest.fn().mockResolvedValue(null), eval: jest.fn() };
    const service = await build(redis);
    const task = jest.fn();

    await expect(
      service.runExclusive('k', 1000, task),
    ).resolves.toBeUndefined();
    expect(task).not.toHaveBeenCalled();
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('任务抛错也要释放锁，否则后续轮次会被一直挡住', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    const service = await build(redis);

    await expect(
      service.runExclusive('k', 1000, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(redis.eval).toHaveBeenCalled();
  });

  it('释放时用 Lua 比对持有者，避免删掉别人刚抢到的锁', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    const service = await build(redis);

    await service.runExclusive('k', 1000, () => Promise.resolve());

    const [script, keyCount, key, token] = redis.eval.mock.calls[0] as [
      string,
      number,
      string,
      string,
    ];
    expect(script).toContain('redis.call("get", KEYS[1]) == ARGV[1]');
    expect(keyCount).toBe(1);
    expect(key).toBe('lock:k');
    // 传进去的必须是加锁时那个随机串
    const setArgs = redis.set.mock.calls[0] as [string, string, ...unknown[]];
    expect(setArgs[1]).toBe(token);
  });

  it('Redis 报错时不把异常抛给调用方，任务照常跳过', async () => {
    const redis = {
      set: jest.fn().mockRejectedValue(new Error('connection lost')),
      eval: jest.fn(),
    };
    const service = await build(redis);
    const task = jest.fn();

    await expect(
      service.runExclusive('k', 1000, task),
    ).resolves.toBeUndefined();
    expect(task).not.toHaveBeenCalled();
  });
});
