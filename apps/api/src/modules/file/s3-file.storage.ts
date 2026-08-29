import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
  send(command: PutObjectCommand): Promise<unknown>;
}

export class S3FileStorage implements FileStorage {
  private readonly client: S3ClientLike;

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
      url: `${this.publicBaseUrl()}/${encodeKey(input.key)}`,
      storage: 's3',
    };
  }

  private publicBaseUrl(): string {
    if (this.options.publicBaseUrl) {
      return trimTrailingSlash(this.options.publicBaseUrl);
    }

    if (this.options.endpoint) {
      const endpoint = new URL(this.options.endpoint);

      if (this.options.forcePathStyle) {
        return `${trimTrailingSlash(endpoint.toString())}/${encodeURIComponent(this.options.bucket)}`;
      }

      endpoint.hostname = `${this.options.bucket}.${endpoint.hostname}`;
      return trimTrailingSlash(endpoint.toString());
    }

    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com`;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
