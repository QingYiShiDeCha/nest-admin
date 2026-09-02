import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { S3FileStorage, type S3ClientLike } from './s3-file.storage';

class FakeS3Client implements S3ClientLike {
  command: PutObjectCommand | DeleteObjectCommand | undefined;

  send(command: PutObjectCommand | DeleteObjectCommand): Promise<unknown> {
    this.command = command;
    return Promise.resolve({});
  }
}

describe('S3FileStorage', () => {
  it('使用 PutObject 上传，并优先返回配置的公开域名', async () => {
    const client = new FakeS3Client();
    const storage = new S3FileStorage(
      {
        region: 'cn-test-1',
        bucket: 'assets',
        endpoint: 'https://s3.example.com',
        forcePathStyle: false,
        publicBaseUrl: 'https://cdn.example.com/files/',
      },
      client,
    );

    const result = await storage.upload({
      key: '2026/08/29/测试 file.png',
      buffer: Buffer.from('image'),
      contentType: 'image/png',
    });

    expect(client.command).toBeInstanceOf(PutObjectCommand);
    expect(client.command?.input).toMatchObject({
      Bucket: 'assets',
      Key: '2026/08/29/测试 file.png',
      ContentType: 'image/png',
      ContentLength: 5,
    });
    expect(result.url).toBe(
      'https://cdn.example.com/files/2026/08/29/%E6%B5%8B%E8%AF%95%20file.png',
    );
  });

  it('path-style endpoint 自动生成 bucket 路径', async () => {
    const client = new FakeS3Client();
    const storage = new S3FileStorage(
      {
        region: 'us-east-1',
        bucket: 'assets',
        endpoint: 'http://127.0.0.1:9000',
        forcePathStyle: true,
      },
      client,
    );

    const result = await storage.upload({
      key: 'a.txt',
      buffer: Buffer.from('a'),
      contentType: 'text/plain',
    });

    expect(result.url).toBe('http://127.0.0.1:9000/assets/a.txt');
  });

  it('使用 DeleteObject 删除对象', async () => {
    const client = new FakeS3Client();
    const storage = new S3FileStorage(
      {
        region: 'cn-test-1',
        bucket: 'assets',
        forcePathStyle: false,
      },
      client,
    );

    await storage.delete('2026/09/02/file.png');

    expect(client.command).toBeInstanceOf(DeleteObjectCommand);
    expect(client.command?.input).toEqual({
      Bucket: 'assets',
      Key: '2026/09/02/file.png',
    });
  });
});
