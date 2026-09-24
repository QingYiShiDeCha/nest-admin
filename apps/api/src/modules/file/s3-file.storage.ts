import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type {
  FileStorage,
  StorageUploadInput,
  StoredFile,
} from './file-storage.interface';

export interface S3FileStorageOptions {
  region: string;
  bucket: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
}

export interface S3ClientLike {
  send(command: PutObjectCommand | DeleteObjectCommand): Promise<unknown>;
}

export class S3FileStorage implements FileStorage {
  readonly driver = 's3' as const;
  private readonly client: S3ClientLike;
  /**
   * 公开基址在构造期算定。原先它推迟到 upload() 里 PutObject **成功之后**才求值：
   * endpoint 写坏时对象已经落桶，请求却失败或拼出谁也访问不到的 URL，
   * 留下拿不到地址的孤儿对象。挪进构造函数后，配置错误在启动期就暴露。
   */
  private readonly baseUrl: string;

  constructor(
    private readonly options: S3FileStorageOptions,
    client?: S3ClientLike,
  ) {
    this.client =
      client ??
      new S3Client({
        region: options.region,
        endpoint: options.endpoint,
        forcePathStyle: options.forcePathStyle,
        credentials:
          options.accessKeyId && options.secretAccessKey
            ? {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey,
              }
            : undefined,
      });
    this.baseUrl = resolvePublicBaseUrl(options);
  }

  async upload(input: StorageUploadInput): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        ContentLength: input.buffer.length,
      }),
    );

    return {
      key: input.key,
      url: `${this.baseUrl}/${encodeKey(input.key)}`,
      storage: 's3',
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      }),
    );
  }
}

function resolvePublicBaseUrl(options: S3FileStorageOptions): string {
  if (options.publicBaseUrl) {
    return trimTrailingSlash(options.publicBaseUrl);
  }

  if (options.endpoint) {
    const endpoint = parseEndpoint(options.endpoint);

    if (options.forcePathStyle) {
      return `${trimTrailingSlash(endpoint.toString())}/${encodeURIComponent(options.bucket)}`;
    }

    endpoint.hostname = `${options.bucket}.${endpoint.hostname}`;
    return trimTrailingSlash(endpoint.toString());
  }

  return `https://${options.bucket}.s3.${options.region}.amazonaws.com`;
}

function parseEndpoint(endpoint: string): URL {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error(
      `S3 endpoint 配置无效：${endpoint}，需要带 scheme（如 http://127.0.0.1:9000）`,
    );
  }

  // `minio:9000` 这类漏写 scheme 的值会被 WHATWG 当成合法的「非特殊 scheme」解析，
  // 不抛错但 hostname 为空，最终拼出 minio:9000/bucket/key 这种谁也访问不到的 URL。
  // 显式限定协议，让配置错误在启动期就报出来。
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `S3 endpoint 必须使用 http 或 https scheme：${endpoint}（protocol=${url.protocol}）`,
    );
  }

  return url;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
