import {
  loginLogs,
  operationLogs,
  refreshTokens,
  type LoginLogRow,
} from '@nest-admin/database';
import type { ConfigService } from '@nestjs/config';
import { gunzipSync } from 'node:zlib';

import type { Env } from '../../config/env.validation';
import type { DrizzleDB } from '../../database/database.constants';
import { RedisLockService } from '../../redis/redis-lock.service';
import type { FileStorage, StoredFile } from '../file/file-storage.interface';
import { LogCleanupService } from './log-cleanup.service';

describe('LogCleanupService', () => {
  const oldCreatedAt = new Date('2026-01-01T00:00:00.000Z');

  function createSelectQuery<T>(rows: T[]) {
    return {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    };
  }

  function createDeleteQuery(affectedRows: number) {
    const result = [{ affectedRows }];
    return {
      where: jest.fn().mockReturnValue(
        Object.assign(Promise.resolve(result), {
          limit: jest.fn().mockResolvedValue(result),
        }),
      ),
    };
  }

  function createService(
    selectRows: unknown[][],
    deleteCounts: number[],
    storage: FileStorage,
  ) {
    const db = {
      select: jest.fn(),
      delete: jest.fn(),
    };
    selectRows.forEach((rows) =>
      db.select.mockReturnValueOnce(createSelectQuery(rows)),
    );
    deleteCounts.forEach((count) =>
      db.delete.mockReturnValueOnce(createDeleteQuery(count)),
    );

    const config = {
      get: jest.fn((key: string) =>
        key === 'LOG_RETENTION_DAYS' ? 90 : 'archives/logs',
      ),
    } as unknown as ConfigService<Env, true>;
    const runExclusive = jest.fn(
      async <T>(_key: string, _ttlMs: number, task: () => Promise<T>) => task(),
    );

    return {
      db,
      service: new LogCleanupService(
        db as unknown as DrizzleDB,
        config,
        { runExclusive } as unknown as RedisLockService,
        storage,
      ),
    };
  }

  function createStorage(
    upload: jest.MockedFunction<FileStorage['upload']>,
  ): FileStorage {
    return {
      driver: 'local',
      upload,
      delete: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('每批先压缩上传归档对象，成功后才删除原日志', async () => {
    const loginRows = [
      {
        id: 7,
        userId: 2,
        username: 'admin',
        ip: '127.0.0.1',
        userAgent: 'test',
        status: 'success',
        failureReason: null,
        createdAt: oldCreatedAt,
      },
    ] as unknown as LoginLogRow[];
    const upload: jest.MockedFunction<FileStorage['upload']> = jest.fn();
    upload.mockResolvedValue({
      key: 'archive',
      url: '/uploads/archive',
      storage: 'local',
    } satisfies StoredFile);
    const storage = createStorage(upload);
    const { db, service } = createService([loginRows, []], [1, 1], storage);

    await expect(service.runManually()).resolves.toMatchObject({
      loginLogs: 1,
      operationLogs: 0,
      refreshTokens: 1,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    const input = upload.mock.calls[0][0];
    expect(input).toMatchObject({
      key: 'archives/logs/login-logs/2026/01/01/7-7.json.gz',
      contentType: 'application/gzip',
      overwrite: true,
    });
    const payload = JSON.parse(gunzipSync(input.buffer).toString('utf8')) as {
      schemaVersion: number;
      table: string;
      rowCount: number;
      rows: Array<{ id: number; username: string; createdAt: string }>;
    };
    expect(payload).toMatchObject({
      schemaVersion: 1,
      table: 'login-logs',
      rowCount: 1,
    });
    expect(payload.rows[0]).toMatchObject({
      id: 7,
      username: 'admin',
      createdAt: oldCreatedAt.toISOString(),
    });
    expect(db.delete).toHaveBeenCalledWith(loginLogs);
    expect(db.delete).toHaveBeenCalledWith(refreshTokens);
    expect(db.delete).not.toHaveBeenCalledWith(operationLogs);
  });

  it('归档存储失败时保留原日志且不继续删除', async () => {
    const loginRows = [
      {
        id: 8,
        username: 'admin',
        createdAt: oldCreatedAt,
      },
    ] as unknown as LoginLogRow[];
    const upload: jest.MockedFunction<FileStorage['upload']> = jest.fn();
    upload.mockRejectedValue(new Error('cold storage unavailable'));
    const { db, service } = createService(
      [loginRows],
      [],
      createStorage(upload),
    );

    await expect(service.runManually()).rejects.toThrow('原始日志已保留');
    expect(db.delete).not.toHaveBeenCalled();
  });
});
