import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalFileStorage } from './local-file.storage';

describe('LocalFileStorage', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'nest-admin-upload-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('按 key 创建目录并写入文件', async () => {
    const storage = new LocalFileStorage(directory, '/uploads');

    const result = await storage.upload({
      key: '2026/08/29/测试 file.txt',
      buffer: Buffer.from('hello'),
      contentType: 'text/plain',
    });

    await expect(
      readFile(join(directory, '2026/08/29/测试 file.txt'), 'utf8'),
    ).resolves.toBe('hello');
    expect(result).toEqual({
      key: '2026/08/29/测试 file.txt',
      url: '/uploads/2026/08/29/%E6%B5%8B%E8%AF%95%20file.txt',
      storage: 'local',
    });

    await storage.delete(result.key);
    await expect(
      access(join(directory, '2026/08/29/测试 file.txt')),
    ).rejects.toThrow();
    await expect(storage.delete(result.key)).resolves.toBeUndefined();
  });

  it('拒绝越出存储根目录的 key', async () => {
    const storage = new LocalFileStorage(directory, '/uploads');

    await expect(
      storage.upload({
        key: '../outside.txt',
        buffer: Buffer.from('bad'),
        contentType: 'text/plain',
      }),
    ).rejects.toThrow('非法文件存储路径');
    await expect(storage.delete('../outside.txt')).rejects.toThrow(
      '非法文件存储路径',
    );
  });
});
