import type { DrizzleDB } from '@nest-admin/database';
import type { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

import type { Env } from '../../config/env.validation';
import type { QueryFileResourceDto } from './dto/query-file-resource.dto';
import type {
  FileStorage,
  StorageUploadInput,
  StoredFile,
} from './file-storage.interface';
import { FileService, resolveFileCategory } from './file.service';

describe('FileService', () => {
  const uploader = { id: 2, username: 'admin' };

  const createService = (
    storage: FileStorage,
    allowed = 'image/*,application/pdf',
    insertValues = jest.fn().mockResolvedValue([{ insertId: 7 }]),
    database?: DrizzleDB,
  ) => {
    const config = {
      get: jest.fn().mockReturnValue(allowed),
    } as unknown as ConfigService<Env, true>;
    const db =
      database ??
      ({
        insert: jest.fn().mockReturnValue({ values: insertValues }),
      } as unknown as DrizzleDB);

    return {
      service: new FileService(storage, db, config),
      insertValues,
    };
  };

  const createFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: 'avatar.PNG',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 3,
      buffer: Buffer.from('png'),
      ...overrides,
    }) as Express.Multer.File;

  const createStorage = (
    upload: FileStorage['upload'] = jest.fn(
      (input: StorageUploadInput): Promise<StoredFile> =>
        Promise.resolve({
          key: input.key,
          url: `/uploads/${input.key}`,
          storage: 'local',
        }),
    ),
    deleteObject: FileStorage['delete'] = jest
      .fn()
      .mockResolvedValue(undefined),
  ): FileStorage => ({
    driver: 'local',
    upload,
    delete: deleteObject,
  });

  it('上传后登记资源元数据与上传人快照', async () => {
    const storage = createStorage();
    const { service, insertValues } = createService(storage);

    const result = await service.upload(createFile(), uploader);

    expect(result.key).toMatch(/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(result).toMatchObject({
      id: 7,
      originalName: 'avatar.PNG',
      mimeType: 'image/png',
      extension: 'png',
      category: 'image',
      size: 3,
      storage: 'local',
      uploaderId: 2,
      uploaderUsername: 'admin',
    });
    expect(result.createdAt).toEqual(expect.any(String));
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        key: result.key,
        uploaderId: 2,
        uploaderUsername: 'admin',
      }),
    );
  });

  it('恢复 multipart 头中被按 Latin-1 解析的中文文件名', async () => {
    const { service, insertValues } = createService(createStorage());

    const result = await service.upload(
      createFile({ originalname: 'å¤´å (4).png' }),
      uploader,
    );

    expect(result.originalName).toBe('头像 (4).png');
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ originalName: '头像 (4).png' }),
    );
  });

  it.each(['头像.png', 'café.png'])(
    '保留已正确解析的文件名 %s',
    async (name) => {
      const { service } = createService(createStorage());

      await expect(
        service.upload(createFile({ originalname: name }), uploader),
      ).resolves.toMatchObject({ originalName: name });
    },
  );

  it('查询我的资源时强制按当前上传人过滤', async () => {
    let capturedWhere: SQL | undefined;
    const rowsWhere = jest.fn((where: SQL) => {
      capturedWhere = where;
      return {
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue([]),
          }),
        }),
      };
    });
    const totalWhere = jest.fn().mockResolvedValue([{ total: 0 }]);
    const select = jest
      .fn()
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: rowsWhere }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: totalWhere }),
      });
    const database = { select } as unknown as DrizzleDB;
    const { service } = createService(
      createStorage(),
      'image/*',
      undefined,
      database,
    );
    const query = {
      page: 1,
      pageSize: 15,
      offset: 0,
      category: 'image',
    } as QueryFileResourceDto;

    await service.findMyPage(query, uploader.id);

    expect(capturedWhere).toBeDefined();
    const compiled = new MySqlDialect().sqlToQuery(capturedWhere!);
    expect(compiled.sql).toContain('`sys_file_resource`.`uploader_id` = ?');
    expect(compiled.params).toContain(uploader.id);
  });

  it('支持 MIME 大类通配符', async () => {
    const { service } = createService(createStorage(), 'image/*');

    await expect(
      service.upload(createFile({ mimetype: 'image/webp' }), uploader),
    ).resolves.toMatchObject({ mimeType: 'image/webp', category: 'image' });
  });

  it('缺少文件时返回 400', async () => {
    const { service } = createService(createStorage());

    await expect(service.upload(undefined, uploader)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('不在白名单中的 MIME 类型返回 400', async () => {
    const upload: jest.MockedFunction<FileStorage['upload']> = jest.fn();
    const { service } = createService(createStorage(upload));

    await expect(
      service.upload(
        createFile({ mimetype: 'application/x-msdownload' }),
        uploader,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });

  it('存储驱动失败时不向客户端泄漏底层错误', async () => {
    const storage = createStorage(
      jest.fn().mockRejectedValue(new Error('secret endpoint error')),
    );
    const { service } = createService(storage);

    await expect(service.upload(createFile(), uploader)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('元数据登记失败时回收已上传对象', async () => {
    const deleteObject = jest.fn().mockResolvedValue(undefined);
    const storage = createStorage(undefined, deleteObject);
    const { service } = createService(
      storage,
      'image/*',
      jest.fn().mockRejectedValue(new Error('database unavailable')),
    );

    await expect(service.upload(createFile(), uploader)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(deleteObject).toHaveBeenCalledWith(expect.stringMatching(/\.png$/));
  });

  it.each([
    ['video/mp4', 'mp4', 'video'],
    ['audio/mpeg', 'mp3', 'audio'],
    ['application/pdf', 'pdf', 'document'],
    ['application/zip', 'zip', 'archive'],
    ['application/octet-stream', null, 'other'],
  ] as const)('将 %s 分类为 %s', (mimeType, extension, expected) => {
    expect(resolveFileCategory(mimeType, extension)).toBe(expected);
  });
});
