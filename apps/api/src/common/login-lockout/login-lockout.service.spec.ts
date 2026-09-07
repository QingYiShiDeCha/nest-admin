import type { LoginLockoutPolicy } from '@nest-admin/shared';

import { LoginLockoutService } from './login-lockout.service';

const POLICY: LoginLockoutPolicy = {
  maxFailures: 5,
  windowSeconds: 300,
  durationSeconds: 900,
};

interface UpdateChain {
  set: jest.Mock;
  where: jest.Mock;
}

function createDb(): { update: jest.Mock; lastChain: UpdateChain } {
  const lastChain: UpdateChain = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  };

  return { update: jest.fn(() => lastChain), lastChain };
}

function createRedis(overrides?: Partial<Record<string, unknown>>): {
  redis: Record<string, jest.Mock>;
  exec: jest.Mock;
} {
  const exec = jest.fn().mockResolvedValue([[null, 1]]);
  const redis: Record<string, jest.Mock> = {
    pttl: jest.fn().mockResolvedValue(-2),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(2),
    pipeline: jest.fn(() => ({
      incr: jest.fn(),
      pexpire: jest.fn(),
      exec,
    })),
    ...overrides,
  };

  return { redis, exec };
}

function createService(
  redis: Record<string, jest.Mock>,
  db: { update: jest.Mock },
): LoginLockoutService {
  return new LoginLockoutService(
    redis as never,
    db as never,
    { resolve: jest.fn().mockResolvedValue(POLICY) } as never,
  );
}

describe('LoginLockoutService.checkLocked', () => {
  it('DB 中 locked_until 未过期即锁定，报告剩余秒数', async () => {
    const service = createService(createRedis().redis, createDb());

    await expect(
      service.checkLocked('admin', {
        lockedUntil: new Date(Date.now() + 60_000),
      }),
    ).resolves.toEqual({ locked: true, remainingSeconds: 60 });
  });

  it('DB 无锁但 Redis 锁键存在时同样拦截', async () => {
    const { redis } = createRedis({ pttl: jest.fn().mockResolvedValue(5000) });
    const service = createService(redis, createDb());

    await expect(service.checkLocked('admin', null)).resolves.toEqual({
      locked: true,
      remainingSeconds: 5,
    });
  });

  it('无任何锁定痕迹时放行', async () => {
    const service = createService(createRedis().redis, createDb());

    await expect(service.checkLocked('admin', null)).resolves.toEqual({
      locked: false,
      remainingSeconds: 0,
    });
  });

  it('过期或无 TTL 的 Redis 键视为未锁定', async () => {
    const service = createService(
      createRedis({ pttl: jest.fn().mockResolvedValue(-1) }).redis,
      createDb(),
    );

    await expect(service.checkLocked('admin', null)).resolves.toEqual({
      locked: false,
      remainingSeconds: 0,
    });
  });
});

describe('LoginLockoutService.recordFailure', () => {
  it('计数未达阈值时不锁定', async () => {
    const { redis, exec } = createRedis();
    exec.mockResolvedValue([[null, 3]]);
    const { update } = createDb();
    const service = createService(redis, { update });

    await expect(service.recordFailure('admin', 1)).resolves.toEqual({
      locked: false,
      remainingSeconds: 0,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('达到阈值时写 Redis 锁键并落库', async () => {
    const { redis, exec } = createRedis();
    exec.mockResolvedValue([[null, 5]]);
    const db = createDb();
    const service = createService(redis, db);

    await expect(service.recordFailure('admin', 1)).resolves.toEqual({
      locked: true,
      remainingSeconds: POLICY.durationSeconds,
    });
    expect(redis.set).toHaveBeenCalledWith(
      'nest-admin:login:lock:admin',
      '1',
      'PX',
      POLICY.durationSeconds * 1000,
    );
    expect(db.update).toHaveBeenCalled();
  });

  it('未知用户名只设 Redis 锁键，不写 DB', async () => {
    const { redis, exec } = createRedis();
    exec.mockResolvedValue([[null, 5]]);
    const db = createDb();
    const service = createService(redis, db);

    await service.recordFailure('ghost', null);

    expect(redis.set).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('Redis 故障时 fail-open：不锁定、不写 DB', async () => {
    const { redis } = createRedis({
      pipeline: jest.fn(() => {
        throw new Error('redis down');
      }),
    });
    const db = createDb();
    const service = createService(redis, db);

    await expect(service.recordFailure('admin', 1)).resolves.toEqual({
      locked: false,
      remainingSeconds: 0,
    });
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe('LoginLockoutService.clearOnSuccess / clearLock', () => {
  it('登录成功清空计数与锁键，并清除 DB 锁定标记', async () => {
    const { redis } = createRedis();
    const db = createDb();
    const service = createService(redis, db);

    await service.clearOnSuccess('admin', 1);

    expect(redis.del).toHaveBeenCalledWith(
      'nest-admin:login:fail:admin',
      'nest-admin:login:lock:admin',
    );
    expect(db.update).toHaveBeenCalled();
    expect(db.lastChain.set).toHaveBeenCalledWith({ lockedUntil: null });
  });

  it('管理员解锁与成功清零走同一套清理', async () => {
    const { redis } = createRedis();
    const db = createDb();
    const service = createService(redis, db);

    await service.clearLock('admin', 1);

    expect(redis.del).toHaveBeenCalled();
    expect(db.lastChain.set).toHaveBeenCalledWith({ lockedUntil: null });
  });

  it('未配置 Redis 时清理只落库，不抛错', async () => {
    const db = createDb();
    const service = createService(
      // redis 为空 falsy 值时构造函数仍可工作（类型上是可选探测）
      undefined as never,
      db,
    );

    await expect(service.clearLock('admin', 1)).resolves.toBeUndefined();
    expect(db.update).toHaveBeenCalled();
  });
});
