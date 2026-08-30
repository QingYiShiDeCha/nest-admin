import { findWorkspaceRoot } from '@nest-admin/shared/node';
import type { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';

import type { Env } from '../../config/env.validation';
import type { FileStorage } from './file-storage.interface';
import { LocalFileStorage } from './local-file.storage';
import { S3FileStorage } from './s3-file.storage';

type AppConfig = ConfigService<Env, true>;

export function createFileStorage(config: AppConfig): FileStorage {
  if (config.get('UPLOAD_DRIVER', { infer: true }) === 's3') {
    return new S3FileStorage({
      region: config.get('UPLOAD_S3_REGION', { infer: true }),
      bucket: config.get('UPLOAD_S3_BUCKET', { infer: true }),
      endpoint: config.get('UPLOAD_S3_ENDPOINT', { infer: true }),
      accessKeyId: config.get('UPLOAD_S3_ACCESS_KEY_ID', { infer: true }),
      secretAccessKey: config.get('UPLOAD_S3_SECRET_ACCESS_KEY', {
        infer: true,
      }),
      forcePathStyle: config.get('UPLOAD_S3_FORCE_PATH_STYLE', {
        infer: true,
      }),
      publicBaseUrl: config.get('UPLOAD_S3_PUBLIC_BASE_URL', {
        infer: true,
      }),
    });
  }

  return new LocalFileStorage(
    resolveLocalUploadDirectory(config),
    normalizeLocalUrlPrefix(config),
  );
}

export function resolveLocalUploadDirectory(config: AppConfig): string {
  const directory = config.get('UPLOAD_LOCAL_DIR', { infer: true });

  return resolve(findWorkspaceRoot(), directory);
}

export function normalizeLocalUrlPrefix(config: AppConfig): string {
  const configured = config.get('UPLOAD_LOCAL_URL_PREFIX', { infer: true });
  const normalized = normalizePathPrefix(configured);

  return normalized || '/uploads';
}

export function buildLocalUploadPrefixes(
  apiPrefix: string,
  uploadPrefix: string,
): string[] {
  const normalizedApiPrefix = normalizePathPrefix(apiPrefix);
  const normalizedUploadPrefix =
    normalizePathPrefix(uploadPrefix) || '/uploads';
  const prefixes = [
    normalizedUploadPrefix,
    `${normalizedApiPrefix}${normalizedUploadPrefix}`,
  ];

  return [...new Set(prefixes)].map((prefix) => `${prefix}/`);
}

function normalizePathPrefix(value: string): string {
  return `/${value}`.replace(/\/+/g, '/').replace(/\/$/, '');
}
