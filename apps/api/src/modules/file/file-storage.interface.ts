import type { FileStorageDriver } from '@nest-admin/shared';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface StorageUploadInput {
  key: string;
  buffer: Buffer;
  contentType: string;
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
