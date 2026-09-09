import type { FileStorageDriver } from '@nest-admin/shared';

export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const LOG_ARCHIVE_STORAGE = Symbol('LOG_ARCHIVE_STORAGE');

export interface StorageUploadInput {
  key: string;
  buffer: Buffer;
  contentType: string;
  /** 仅供内部幂等归档对象使用；普通上传默认禁止覆盖。 */
  overwrite?: boolean;
}

export interface StoredFile {
  key: string;
  url: string;
  storage: FileStorageDriver;
}

export interface FileStorage {
  readonly driver: FileStorageDriver;
  upload(input: StorageUploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}
