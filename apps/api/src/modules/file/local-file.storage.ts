import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  FileStorage,
  StorageUploadInput,
  StoredFile,
} from './file-storage.interface';

export class LocalFileStorage implements FileStorage {
  constructor(
    private readonly rootDirectory: string,
    private readonly urlPrefix: string,
  ) {}

  async upload(input: StorageUploadInput): Promise<StoredFile> {
    const target = resolve(this.rootDirectory, input.key);
    const rootPrefix = `${resolve(this.rootDirectory)}${sep}`;

    if (!target.startsWith(rootPrefix)) {
      throw new Error('非法文件存储路径');
    }

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, input.buffer, { flag: 'wx' });

    return {
      key: input.key,
      url: `${this.urlPrefix}/${encodeKey(input.key)}`,
      storage: 'local',
    };
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
