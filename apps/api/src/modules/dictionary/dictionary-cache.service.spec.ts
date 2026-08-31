import type { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.validation';
import type { RedisClient } from '../../redis/redis.constants';
import { DictionaryCacheService } from './dictionary-cache.service';

describe('DictionaryCacheService', () => {
  const build = (redis: unknown): DictionaryCacheService => {
    const config = {
      get: jest.fn().mockReturnValue(300),
    } as unknown as ConfigService<Env, true>;
    return new DictionaryCacheService(redis as RedisClient, config);
  };

  it('未配置 Redis 时返回不可回写的 miss', async () => {
    await expect(build(null).lookup('business.priority')).resolves.toEqual({
      key: null,
    });
  });

  it('缓存命中时校验字典项结构', async () => {
    const options = [{ label: '高', value: 'high', tone: 'error' }];
    const redis = {
      get: jest
        .fn()
        .mockResolvedValueOnce('3')
        .mockResolvedValueOnce(JSON.stringify(options)),
    };

    await expect(build(redis).lookup('business.priority')).resolves.toEqual({
      key: 'nest-admin:dict:v1:options:business.priority:3',
      value: options,
    });
  });

  it('损坏缓存会被删除并按 miss 处理', async () => {
    const redis = {
      get: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('{}'),
      del: jest.fn().mockResolvedValue(1),
    };
    const lookup = await build(redis).lookup('business.priority');

    expect(lookup).toEqual({
      key: 'nest-admin:dict:v1:options:business.priority:0',
    });
    expect(redis.del).toHaveBeenCalledWith(lookup.key);
  });

  it('Redis 读取失败时降级数据库且不允许回写', async () => {
    const redis = { get: jest.fn().mockRejectedValue(new Error('offline')) };

    await expect(build(redis).lookup('business.priority')).resolves.toEqual({
      key: null,
    });
  });

  it('失效只递增版本，旧并发仍回写旧票据', async () => {
    const pipeline = {
      incr: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    const redis = {
      get: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      set: jest.fn().mockResolvedValue('OK'),
      pipeline: jest.fn(() => pipeline),
    };
    const service = build(redis);
    const lookup = await service.lookup('business.priority');

    await service.invalidate('business.priority');
    await service.store(lookup, [
      { label: '高', value: 'high', tone: 'error' },
    ]);

    expect(pipeline.incr).toHaveBeenCalledWith(
      'nest-admin:dict:v1:revision:business.priority',
    );
    expect(redis.set).toHaveBeenCalledWith(
      'nest-admin:dict:v1:options:business.priority:0',
      expect.any(String),
      'EX',
      300,
    );
  });
});
