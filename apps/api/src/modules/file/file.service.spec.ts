import type { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { Env } from '../../config/env.validation';
import type {
  FileStorage,
  StorageUploadInput,
  StoredFile,
} from './file-storage.interface';
import { FileService } from './file.service';

describe('FileService', () => {
  const createService = (
    storage: FileStorage,
    allowed = 'image/*,application/pdf',
  ) => {
    const config = {
      get: jest.fn().mockReturnValue(allowed),
    } as unknown as ConfigService<Env, true>;

    return new FileService(storage, config);
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

  it('生成不可预测的日期分层 key，并返回统一上传契约', async () => {
    const upload = jest.fn((input: StorageUploadInput): Promise<StoredFile> =>
      Promise.resolve({
        key: input.key,
        url: `/uploads/${input.key}`,
        storage: 'local',
      }),
    );
    const storage: FileStorage = { upload };
    const service = createService(storage);

    const result = await service.upload(createFile());

    expect(result.key).toMatch(/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(result).toMatchObject({
      originalName: 'avatar.PNG',
      mimeType: 'image/png',
      size: 3,
      storage: 'local',
    });
    expect(upload).toHaveBeenCalledWith({
      key: result.key,
      buffer: Buffer.from('png'),
      contentType: 'image/png',
    });
  });

  it('支持 MIME 大类通配符', async () => {
    const storage: FileStorage = {
      upload: jest.fn().mockResolvedValue({
        key: 'key',
        url: '/uploads/key',
        storage: 'local',
      }),
    };
    const service = createService(storage, 'image/*');

    await expect(
      service.upload(createFile({ mimetype: 'image/webp' })),
    ).resolves.toMatchObject({ mimeType: 'image/webp' });
  });

  it('缺少文件时返回 400', async () => {
    const service = createService({ upload: jest.fn() });

    await expect(service.upload(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('不在白名单中的 MIME 类型返回 400', async () => {
    const upload: jest.MockedFunction<FileStorage['upload']> = jest.fn();
    const storage: FileStorage = { upload };
    const service = createService(storage);

    await expect(
      service.upload(createFile({ mimetype: 'application/x-msdownload' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });

  it('存储驱动失败时不向客户端泄漏底层错误', async () => {
    const storage: FileStorage = {
      upload: jest.fn().mockRejectedValue(new Error('secret endpoint error')),
    };
    const service = createService(storage);

    await expect(service.upload(createFile())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
