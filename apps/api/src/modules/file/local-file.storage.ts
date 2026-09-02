import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  FileStorage,
  StorageUploadInput,
  StoredFile,
} from './file-storage.interface';

export class LocalFileStorage implements FileStorage {
  readonly driver = 'local' as const;

  constructor(
    private readonly rootDirectory: string,
    private readonly urlPrefix: string,
  ) {}

  async upload(input: StorageUploadInput): Promise<StoredFile> {
    const target = this.resolveTarget(input.key);

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, input.buffer, { flag: 'wx' });

    return {
      key: input.key,
      url: `${this.urlPrefix}/${encodeKey(input.key)}`,
      storage: 'local',
    };
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveTarget(key), { force: true });
  }

  private resolveTarget(key: string): string {
    const target = resolve(this.rootDirectory, key);
    const rootPrefix = `${resolve(this.rootDirectory)}${sep}`;

    if (!target.startsWith(rootPrefix)) {
      throw new Error('非法文件存储路径');
    }

    return target;
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
