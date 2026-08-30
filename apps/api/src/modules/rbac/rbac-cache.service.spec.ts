import type { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.validation';
import type { RedisClient } from '../../redis/redis.constants';
import { RbacCacheService } from './rbac-cache.service';

describe('RbacCacheService', () => {
  const build = (redis: unknown): RbacCacheService => {
    const config = {
      get: jest.fn().mockReturnValue(300),
    } as unknown as ConfigService<Env, true>;
    return new RbacCacheService(redis as RedisClient, config);
  };

  it('未配置 Redis 时返回不可回写的 miss，业务可直接查询数据库', async () => {
    const service = build(null);

    await expect(service.lookupAuthorization(7)).resolves.toEqual({
      key: null,
    });
    await expect(service.lookupDataScope(7, 2)).resolves.toEqual({ key: null });
  });

  it('授权缓存命中时校验 JSON 结构并返回结果', async () => {
    const authorization = {
      roles: ['editor'],
      permissions: ['system:user:list'],
      isSuperAdmin: false,
    };
    const redis = {
      get: jest
        .fn()
        .mockResolvedValueOnce('4')
        .mockResolvedValueOnce(JSON.stringify(authorization)),
    };
    const service = build(redis);

    await expect(service.lookupAuthorization(7)).resolves.toEqual({
      key: 'nest-admin:rbac:v1:authorization:7:4',
      value: authorization,
    });
  });

  it('数据范围 miss 使用树版本、用户版本与所属部门组成票据', async () => {
    const redis = {
      mget: jest.fn().mockResolvedValue(['3', '8']),
      get: jest.fn().mockResolvedValue(null),
    };
    const service = build(redis);

    await expect(service.lookupDataScope(9, 5)).resolves.toEqual({
      key: 'nest-admin:rbac:v1:data-scope:3:9:8:5',
    });
  });

  it('损坏缓存会被删除并按 miss 处理', async () => {
    const redis = {
      get: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('{bad json'),
      del: jest.fn().mockResolvedValue(1),
    };
    const service = build(redis);

    const lookup = await service.lookupAuthorization(7);

    expect(lookup).toEqual({
      key: 'nest-admin:rbac:v1:authorization:7:0',
    });
    expect(redis.del).toHaveBeenCalledWith(lookup.key);
  });

  it('Redis 读取失败时返回不可回写的 miss，不向业务抛异常', async () => {
    const redis = { get: jest.fn().mockRejectedValue(new Error('offline')) };
    const service = build(redis);

    await expect(service.lookupAuthorization(7)).resolves.toEqual({
      key: null,
    });
  });

  it('按查询时拿到的旧票据回写，失效并发发生后不会污染新版本', async () => {
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
    const lookup = await service.lookupAuthorization(7);

    await service.invalidateUsers([7]);
    await service.store(lookup, {
      roles: [],
      permissions: [],
      isSuperAdmin: false,
    });

    expect(pipeline.incr).toHaveBeenCalledWith(
      'nest-admin:rbac:v1:user-revision:7',
    );
    expect(redis.set).toHaveBeenCalledWith(
      'nest-admin:rbac:v1:authorization:7:0',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('部门树变化只递增全局版本，不扫描缓存键', async () => {
    const redis = { incr: jest.fn().mockResolvedValue(2) };
    const service = build(redis);

    await service.invalidateDepartmentTree();

    expect(redis.incr).toHaveBeenCalledWith(
      'nest-admin:rbac:v1:data-scope:tree-revision',
    );
  });
});
