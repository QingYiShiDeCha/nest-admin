import type { FileUploadResult } from '@nest-admin/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extension as extensionForMimeType } from 'mime-types';
import { randomUUID } from 'node:crypto';

import type { Env } from '../../config/env.validation';
import { FILE_STORAGE, type FileStorage } from './file-storage.interface';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly allowedMimeTypes: string[];

  constructor(
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    config: ConfigService<Env, true>,
  ) {
    this.allowedMimeTypes = config
      .get('UPLOAD_ALLOWED_MIME_TYPES', { infer: true })
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  async upload(
    file: Express.Multer.File | undefined,
  ): Promise<FileUploadResult> {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (!this.isMimeTypeAllowed(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型：${file.mimetype}`);
    }

    const key = createObjectKey(file.mimetype);

    try {
      const stored = await this.storage.upload({
        key,
        buffer: file.buffer,
        contentType: file.mimetype,
      });

      return {
        ...stored,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(
        `上传文件 ${file.originalname} 失败`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('文件存储服务暂不可用');
    }
  }

  private isMimeTypeAllowed(mimeType: string): boolean {
    const normalized = mimeType.toLowerCase();

    return this.allowedMimeTypes.some((allowed) => {
      if (allowed === '*/*') {
        return true;
      }

      if (allowed.endsWith('/*')) {
        return normalized.startsWith(allowed.slice(0, -1));
      }

      return allowed === normalized;
    });
  }
}

function createObjectKey(mimeType: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const mappedExtension = extensionForMimeType(mimeType);
  const extension =
    mappedExtension && /^[a-z0-9]{1,10}$/.test(mappedExtension)
      ? `.${mappedExtension}`
      : '';

  return `${year}/${month}/${day}/${randomUUID()}${extension}`;
}
