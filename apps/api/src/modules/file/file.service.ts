import {
  fileResources,
  users,
  type FileResourceRow,
} from '@nest-admin/database';
import type {
  FileCategory,
  FileUploadResult,
  PaginatedResult,
} from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  type SQL,
} from 'drizzle-orm';
import { extension as extensionForMimeType } from 'mime-types';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  DataScopeService,
  type DataScopeSubject,
} from '../rbac/data-scope.service';
import type { QueryFileResourceDto } from './dto/query-file-resource.dto';
import { findContentTypeMismatch } from './file-signature';
import { FILE_STORAGE, type FileStorage } from './file-storage.interface';

export interface FileResourceRecord extends Omit<FileResourceRow, 'deletedAt'> {
  referenceCount: number;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly allowedMimeTypes: string[];

  constructor(
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    config: ConfigService<Env, true>,
    private readonly dataScopes: DataScopeService,
  ) {
    this.allowedMimeTypes = config
      .get('UPLOAD_ALLOWED_MIME_TYPES', { infer: true })
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  async upload(
    file: Express.Multer.File | undefined,
    uploader: Pick<AuthUser, 'id' | 'username'>,
  ): Promise<FileUploadResult> {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (!this.isMimeTypeAllowed(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型：${file.mimetype}`);
    }

    // 上面比的是客户端自报的 Content-Type，改个请求头就能把任意内容伪装成 image/png，
    // 而伪装结果会一路决定存储 key 后缀、入库 mimeType 和回显 category。
    // 这里用魔数反向校验，只对「嗅得出类型」的内容生效。
    const mismatch = findContentTypeMismatch(file.buffer, file.mimetype);
    if (mismatch) {
      throw new BadRequestException(mismatch);
    }

    const originalName = normalizeMultipartFilename(file.originalname);
    const key = createObjectKey(file.mimetype);
    let stored: Awaited<ReturnType<FileStorage['upload']>>;

    try {
      stored = await this.storage.upload({
        key,
        buffer: file.buffer,
        contentType: file.mimetype,
      });
    } catch (error) {
      this.logger.error(
        `上传文件 ${originalName} 失败`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('文件存储服务暂不可用');
    }

    const createdAt = new Date();
    const extension = resolveExtension(originalName, file.mimetype);
    const resource = {
      key: stored.key,
      url: stored.url,
      originalName,
      mimeType: file.mimetype,
      extension,
      category: resolveFileCategory(file.mimetype, extension),
      size: file.size,
      storage: stored.storage,
      uploaderId: uploader.id,
      uploaderUsername: uploader.username,
      createdAt,
    } as const;

    try {
      const [result] = await this.db.insert(fileResources).values(resource);

      return {
        id: result.insertId,
        ...resource,
        createdAt: createdAt.toISOString(),
      };
    } catch (error) {
      await this.storage.delete(stored.key).catch((cleanupError: unknown) => {
        this.logger.error(
          `回收未登记文件 ${stored.key} 失败`,
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      });
      this.logger.error(
        `登记文件资源 ${originalName} 失败`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('文件资源登记失败');
    }
  }

  async findPage(
    query: QueryFileResourceDto,
    subject: DataScopeSubject,
  ): Promise<PaginatedResult<FileResourceRecord>> {
    return this.findPageByUploader(query, undefined, subject);
  }

  async findMyPage(
    query: QueryFileResourceDto,
    uploaderId: number,
  ): Promise<PaginatedResult<FileResourceRecord>> {
    return this.findPageByUploader(query, uploaderId);
  }

  private async findPageByUploader(
    query: QueryFileResourceDto,
    uploaderId?: number,
    subject?: DataScopeSubject,
  ): Promise<PaginatedResult<FileResourceRecord>> {
    const scopeCondition = subject
      ? await this.dataScopes.buildUserIdCondition(
          subject,
          fileResources.uploaderId,
        )
      : undefined;
    const conditions: (SQL | undefined)[] = [
      isNull(fileResources.deletedAt),
      scopeCondition,
      uploaderId === undefined
        ? undefined
        : eq(fileResources.uploaderId, uploaderId),
      query.keyword
        ? or(
            like(fileResources.originalName, `%${query.keyword}%`),
            like(fileResources.mimeType, `%${query.keyword}%`),
            like(fileResources.key, `%${query.keyword}%`),
            like(fileResources.uploaderUsername, `%${query.keyword}%`),
          )
        : undefined,
      query.category ? eq(fileResources.category, query.category) : undefined,
      query.storage ? eq(fileResources.storage, query.storage) : undefined,
    ];
    const where = and(
      ...conditions.filter((condition) => condition !== undefined),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(fileResources)
        .where(where)
        .orderBy(desc(fileResources.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(fileResources).where(where),
    ]);

    return {
      list: await this.withReferenceCounts(rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(
    id: number,
    subject: DataScopeSubject,
  ): Promise<FileResourceRecord> {
    const row = await this.findActiveRow(id, subject);
    const [resource] = await this.withReferenceCounts([row]);
    return resource;
  }

  async remove(id: number, subject: DataScopeSubject): Promise<void> {
    const row = await this.findActiveRow(id, subject);

    if (row.storage !== this.storage.driver) {
      throw new ConflictException(
        `文件存储于 ${row.storage}，当前启用的是 ${this.storage.driver} 驱动，无法安全删除`,
      );
    }

    const referenceCount = await this.countReferences(row.url);

    if (referenceCount > 0) {
      throw new ConflictException(
        `文件正在被 ${referenceCount} 个用户头像引用，请先解除引用`,
      );
    }

    // 先软删记录、后清存储对象。原顺序是对象先没、记录后改，
    // update 一旦失败就留下「记录还在、对象已删」的破链，该 URL 之后每次被读都是坏链接。
    const [result] = await this.db
      .update(fileResources)
      .set({ deletedAt: new Date() })
      .where(and(eq(fileResources.id, id), isNull(fileResources.deletedAt)));

    if (result.affectedRows === 0) {
      throw new NotFoundException(`文件资源 ${id} 不存在`);
    }

    // 对象删除失败不再让接口失败：记录已软删，残留的是可回收的孤儿对象，
    // 比反向的破链（记录活着、对象没了）安全得多。
    try {
      await this.storage.delete(row.key);
    } catch (error) {
      this.logger.error(
        `存储对象 ${row.key} 删除失败，记录已软删，留待对账清理`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async findActiveRow(
    id: number,
    subject: DataScopeSubject,
  ): Promise<FileResourceRow> {
    const scopeCondition = await this.dataScopes.buildUserIdCondition(
      subject,
      fileResources.uploaderId,
    );
    const [row] = await this.db
      .select()
      .from(fileResources)
      .where(
        and(
          eq(fileResources.id, id),
          isNull(fileResources.deletedAt),
          scopeCondition,
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`文件资源 ${id} 不存在`);
    }

    return row;
  }

  private async withReferenceCounts(
    rows: FileResourceRow[],
  ): Promise<FileResourceRecord[]> {
    if (rows.length === 0) return [];

    const urls = [...new Set(rows.map((row) => row.url))];
    const references = await this.db
      .select({ url: users.avatar, total: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), inArray(users.avatar, urls)))
      .groupBy(users.avatar);
    const totals = new Map(
      references.flatMap((item) =>
        item.url ? ([[item.url, item.total]] as const) : [],
      ),
    );

    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      url: row.url,
      originalName: row.originalName,
      mimeType: row.mimeType,
      extension: row.extension,
      category: row.category,
      size: row.size,
      storage: row.storage,
      uploaderId: row.uploaderId,
      uploaderUsername: row.uploaderUsername,
      createdAt: row.createdAt,
      referenceCount: totals.get(row.url) ?? 0,
    }));
  }

  private async countReferences(url: string): Promise<number> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(users)
      .where(and(eq(users.avatar, url), isNull(users.deletedAt)));

    return total;
  }

  private isMimeTypeAllowed(mimeType: string): boolean {
    const normalized = mimeType.toLowerCase();

    return this.allowedMimeTypes.some((allowed) => {
      if (allowed === '*/*') return true;
      if (allowed.endsWith('/*')) {
        return normalized.startsWith(allowed.slice(0, -1));
      }
      return allowed === normalized;
    });
  }
}

export function resolveFileCategory(
  mimeType: string,
  extension: string | null,
): FileCategory {
  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  if (
    normalized === 'application/zip' ||
    normalized === 'application/x-7z-compressed' ||
    normalized === 'application/x-rar-compressed' ||
    ['zip', '7z', 'rar', 'tar', 'gz'].includes(extension ?? '')
  ) {
    return 'archive';
  }
  if (
    normalized.startsWith('text/') ||
    normalized === 'application/pdf' ||
    normalized.includes('document') ||
    normalized.includes('spreadsheet') ||
    normalized.includes('presentation') ||
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt'].includes(
      extension ?? '',
    )
  ) {
    return 'document';
  }
  return 'other';
}

function resolveExtension(
  originalName: string,
  mimeType: string,
): string | null {
  const originalExtension = extname(originalName).slice(1).toLowerCase();
  if (/^[a-z0-9]{1,32}$/.test(originalExtension)) return originalExtension;

  const mapped = extensionForMimeType(mimeType);
  return mapped && /^[a-z0-9]{1,32}$/.test(mapped) ? mapped : null;
}

function normalizeMultipartFilename(filename: string): string {
  if ([...filename].some((character) => character.codePointAt(0)! > 0xff)) {
    return filename;
  }

  const decoded = Buffer.from(filename, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? filename : decoded;
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
