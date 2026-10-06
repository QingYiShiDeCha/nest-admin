import {
  oauthIdentities,
  oauthProviders,
  users,
  type OAuthProviderRow,
} from '@nest-admin/database';
import {
  OAUTH_PROVIDER_META,
  type OAuthProvider,
  type OAuthProviderKey,
  type OAuthProviderPublic,
  type OAuthProviderPayload,
  type PaginatedResult,
} from '@nest-admin/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { REDIS_CLIENT, type RedisClient } from '../../redis/redis.constants';
import { LoginLogService } from '../login-log/login-log.service';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import type { AuthResult } from './interfaces/jwt-payload.interface';

const STATE_TTL_SECONDS = 600;
const TICKET_TTL_SECONDS = 60;
const IMPLEMENTED_PROVIDER_KEYS = new Set<OAuthProviderKey>(['github']);

interface OAuthState {
  provider: OAuthProviderKey;
  codeVerifier: string;
}

interface OAuthProfile {
  subject: string;
  username: string | null;
  email: string | null;
  avatar: string | null;
}

interface OAuthTokenResponse {
  access_token?: string;
  token_type?: string;
}

const DEFAULTS: Record<
  OAuthProviderKey,
  Omit<OAuthProviderPayload, 'key' | 'name' | 'clientId' | 'clientSecret'>
> = {
  github: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    enabled: false,
    autoRegister: false,
    sort: 0,
  },
  dingtalk: {
    authorizationUrl: 'https://login.dingtalk.com/oauth2/auth',
    tokenUrl: 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken',
    userInfoUrl: 'https://api.dingtalk.com/v1.0/contact/users/me',
    scopes: ['openid'],
    enabled: false,
    autoRegister: false,
    sort: 10,
  },
  wechat: {
    authorizationUrl: 'https://open.weixin.qq.com/connect/qrconnect',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
    scopes: ['snsapi_login'],
    enabled: false,
    autoRegister: false,
    sort: 20,
  },
};

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    private readonly config: ConfigService<Env, true>,
    private readonly users: UserService,
    private readonly auth: AuthService,
    private readonly context: RequestContext,
    private readonly loginLogs: LoginLogService,
  ) {}

  async findPage(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<OAuthProvider>> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(oauthProviders)
        .where(isNull(oauthProviders.deletedAt))
        .orderBy(oauthProviders.sort, desc(oauthProviders.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(oauthProviders)
        .where(isNull(oauthProviders.deletedAt)),
    ]);
    return {
      list: rows.map((row) => this.toContract(row)),
      total,
      page,
      pageSize,
    };
  }

  async findDetail(id: number): Promise<OAuthProvider> {
    return this.toContract(await this.findRow(id));
  }

  async create(payload: OAuthProviderPayload): Promise<OAuthProvider> {
    const defaults = DEFAULTS[payload.key];
    const [existing] = await this.db
      .select({ id: oauthProviders.id })
      .from(oauthProviders)
      .where(eq(oauthProviders.key, payload.key))
      .limit(1);
    if (existing)
      throw new BadRequestException(`OAuth 提供商 ${payload.key} 已存在`);
    const [result] = await this.db.insert(oauthProviders).values({
      key: payload.key,
      name: payload.name,
      clientId: payload.clientId,
      clientSecretEncrypted: this.encrypt(payload.clientSecret ?? ''),
      authorizationUrl: payload.authorizationUrl ?? defaults.authorizationUrl!,
      tokenUrl: payload.tokenUrl ?? defaults.tokenUrl!,
      userInfoUrl: payload.userInfoUrl ?? defaults.userInfoUrl!,
      scopes: JSON.stringify(payload.scopes ?? defaults.scopes),
      enabled: payload.enabled ?? false,
      autoRegister: payload.autoRegister ?? false,
      sort: payload.sort ?? defaults.sort,
      ...this.context.auditOnCreate(),
    });
    return this.findDetail(result.insertId);
  }

  async update(
    id: number,
    payload: Partial<OAuthProviderPayload>,
  ): Promise<OAuthProvider> {
    const current = await this.findRow(id);
    if (payload.key && payload.key !== current.key) {
      throw new BadRequestException('OAuth 提供商标识创建后不可修改');
    }
    const values = {
      ...(payload.name === undefined ? {} : { name: payload.name }),
      ...(payload.clientId === undefined ? {} : { clientId: payload.clientId }),
      ...(payload.clientSecret
        ? { clientSecretEncrypted: this.encrypt(payload.clientSecret) }
        : {}),
      ...(payload.authorizationUrl === undefined
        ? {}
        : { authorizationUrl: payload.authorizationUrl }),
      ...(payload.tokenUrl === undefined ? {} : { tokenUrl: payload.tokenUrl }),
      ...(payload.userInfoUrl === undefined
        ? {}
        : { userInfoUrl: payload.userInfoUrl }),
      ...(payload.scopes === undefined
        ? {}
        : { scopes: JSON.stringify(payload.scopes) }),
      ...(payload.enabled === undefined ? {} : { enabled: payload.enabled }),
      ...(payload.autoRegister === undefined
        ? {}
        : { autoRegister: payload.autoRegister }),
      ...(payload.sort === undefined ? {} : { sort: payload.sort }),
      ...this.context.auditOnUpdate(),
    };
    if (Object.keys(values).length === 1)
      throw new BadRequestException('没有需要更新的字段');
    await this.db
      .update(oauthProviders)
      .set(values)
      .where(eq(oauthProviders.id, id));
    return this.findDetail(id);
  }

  async remove(id: number): Promise<void> {
    await this.findRow(id);
    // 硬删而不是打墓碑：provider_key 上是无条件唯一索引
    // （uk_sys_oauth_provider_key，覆盖软删行），而这一列只有枚举里那几个固定取值。
    // 软删等于「删掉 GitHub 之后永远加不回来」。
    //
    // oauth_identities 刻意保留：它是 (providerKey, subject) → userId 的绑定，
    // 一起删会让重新添加后老用户被当成新人重复建号。
    // 副作用要知情：重新添加同名 key 时，既有绑定会直接命中旧账号，
    // 相当于沿用上一任该 provider 下注册的用户。
    await this.db.delete(oauthProviders).where(eq(oauthProviders.id, id));
  }

  listEnabled(): Promise<OAuthProviderPublic[]> {
    return this.db
      .select({ key: oauthProviders.key, name: oauthProviders.name })
      .from(oauthProviders)
      .where(
        and(eq(oauthProviders.enabled, true), isNull(oauthProviders.deletedAt)),
      )
      .orderBy(oauthProviders.sort, oauthProviders.id)
      .then((rows) =>
        rows
          .filter((row) => IMPLEMENTED_PROVIDER_KEYS.has(row.key))
          .map((row) => ({
            ...row,
            icon: OAUTH_PROVIDER_META[row.key].icon,
          })),
      );
  }

  async authorize(providerKey: OAuthProviderKey): Promise<string> {
    const provider = await this.findEnabled(providerKey);
    const redis = this.requireRedis();
    const state = randomBytes(24).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    await redis.set(
      this.stateKey(state),
      JSON.stringify({ provider: provider.key, codeVerifier }),
      'EX',
      STATE_TTL_SECONDS,
    );
    const url = new URL(provider.authorizationUrl);
    url.searchParams.set('client_id', provider.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri(provider.key));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.parseScopes(provider.scopes).join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async callback(
    providerKey: OAuthProviderKey,
    code: string,
    state: string,
  ): Promise<string> {
    const redis = this.requireRedis();
    const raw = await redis.getdel(this.stateKey(state));
    if (!raw)
      throw new UnauthorizedException('OAuth 登录状态已失效，请重新登录');
    const saved = JSON.parse(raw) as OAuthState;
    if (saved.provider !== providerKey)
      throw new UnauthorizedException('OAuth 登录状态不匹配');
    const provider = await this.findEnabled(providerKey);
    const tokens = await this.exchangeCode(provider, code, saved.codeVerifier);
    const profile = await this.fetchProfile(provider, tokens.access_token!);
    const user = await this.resolveUser(provider, profile);
    const result = await this.auth.issueAuthResult(user);
    await this.loginLogs.record({
      userId: user.id,
      username: user.username,
      ip: this.context.ip,
      userAgent: this.context.userAgent,
      status: 'success',
      failureReason: null,
    });
    const ticket = randomBytes(32).toString('base64url');
    await redis.set(
      this.ticketKey(ticket),
      JSON.stringify(result),
      'EX',
      TICKET_TTL_SECONDS,
    );
    return ticket;
  }

  async exchange(ticket: string): Promise<AuthResult> {
    const raw = await this.requireRedis().getdel(this.ticketKey(ticket));
    if (!raw)
      throw new UnauthorizedException('OAuth 登录凭证已失效，请重新登录');
    return JSON.parse(raw) as AuthResult;
  }

  frontendCallbackUrl(): string {
    return this.config.get('OAUTH_FRONTEND_CALLBACK_URL', { infer: true });
  }

  private async resolveUser(provider: OAuthProviderRow, profile: OAuthProfile) {
    const [identity] = await this.db
      .select()
      .from(oauthIdentities)
      .where(
        and(
          eq(oauthIdentities.providerKey, provider.key),
          eq(oauthIdentities.subject, profile.subject),
        ),
      )
      .limit(1);
    if (identity) {
      const user = await this.users.findById(identity.userId);
      if (user.status !== 'active')
        throw new UnauthorizedException('账号已被禁用');
      await this.db
        .update(oauthIdentities)
        .set({
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
        })
        .where(eq(oauthIdentities.id, identity.id));
      return user;
    }
    if (!provider.autoRegister)
      throw new UnauthorizedException('该 OAuth 账号尚未绑定系统用户');
    const username = `oauth_${provider.key}_${createHash('sha256').update(profile.subject).digest('hex').slice(0, 16)}`;
    const user = await this.users.create({
      username: username.slice(0, 32),
      password: `${randomBytes(32).toString('base64url')}Aa1!`,
      nickname: this.truncate(profile.username, 32) ?? undefined,
      email: this.truncate(profile.email, 128) ?? undefined,
      avatar: this.truncate(profile.avatar, 255) ?? undefined,
    });
    try {
      await this.db.insert(oauthIdentities).values({
        userId: user.id,
        providerKey: provider.key,
        subject: profile.subject,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar,
      });
    } catch (error) {
      // 身份没落成，这个刚建的账号就没人认领了，反过来把它删掉。
      // 必须硬删：username 是 subject 的确定性派生值，而 uk_sys_user_username
      // 是无条件索引，留一个墓碑就等于该 OAuth 主体永久无法再登录。
      // 刚建的号此时还没有部门、角色、会话与 RBAC 缓存，直接删表没有绕过必要的收尾。
      await this.db
        .delete(users)
        .where(eq(users.id, user.id))
        .catch((cleanupError: unknown) => {
          // 回滚也失败时只报出来，不掩盖原始错误：并发撞上唯一索引才是常见原因
          this.logger.error(
            `回滚 OAuth 自动注册账号 ${user.id} 失败，需人工清理`,
            cleanupError instanceof Error
              ? cleanupError.stack
              : String(cleanupError),
          );
        });

      throw error;
    }
    return user;
  }

  private async exchangeCode(
    provider: OAuthProviderRow,
    code: string,
    verifier: string,
  ): Promise<OAuthTokenResponse> {
    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: provider.clientId,
        client_secret: this.decrypt(provider.clientSecretEncrypted),
        code,
        redirect_uri: this.redirectUri(provider.key),
        code_verifier: verifier,
      }).toString(),
    });
    if (!response.ok) throw new UnauthorizedException('OAuth 授权码交换失败');
    const body = (await response.json()) as OAuthTokenResponse;
    if (!body.access_token)
      throw new UnauthorizedException('OAuth 未返回访问令牌');
    return body;
  }

  private async fetchProfile(
    provider: OAuthProviderRow,
    accessToken: string,
  ): Promise<OAuthProfile> {
    const response = await fetch(provider.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new UnauthorizedException('OAuth 用户信息获取失败');
    const body = (await response.json()) as Record<string, unknown>;
    const subject = this.primitiveString(body.id ?? body.sub) ?? '';
    if (!subject) throw new UnauthorizedException('OAuth 用户信息缺少唯一标识');
    return {
      subject,
      username: this.stringValue(
        body.login ?? body.username ?? body.nickname ?? body.name,
      ),
      email: this.stringValue(body.email),
      avatar: this.stringValue(body.avatar_url ?? body.avatar ?? body.picture),
    };
  }

  private async findEnabled(key: OAuthProviderKey): Promise<OAuthProviderRow> {
    if (!IMPLEMENTED_PROVIDER_KEYS.has(key)) {
      throw new BadRequestException(`OAuth 提供商 ${key} 的协议适配尚未完成`);
    }
    const [row] = await this.db
      .select()
      .from(oauthProviders)
      .where(
        and(
          eq(oauthProviders.key, key),
          eq(oauthProviders.enabled, true),
          isNull(oauthProviders.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`OAuth 提供商 ${key} 未启用`);
    return row;
  }

  private async findRow(id: number): Promise<OAuthProviderRow> {
    const [row] = await this.db
      .select()
      .from(oauthProviders)
      .where(and(eq(oauthProviders.id, id), isNull(oauthProviders.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException(`OAuth 提供商 ${id} 不存在`);
    return row;
  }

  private toContract(row: OAuthProviderRow): OAuthProvider {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      clientId: row.clientId,
      authorizationUrl: row.authorizationUrl,
      tokenUrl: row.tokenUrl,
      userInfoUrl: row.userInfoUrl,
      scopes: this.parseScopes(row.scopes),
      enabled: row.enabled,
      autoRegister: row.autoRegister,
      sort: row.sort,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseScopes(value: string): string[] {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return value.split(/\s+/).filter(Boolean);
    }
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secretKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  private decrypt(value: string): string {
    const [iv, tag, encrypted] = value.split('.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.secretKey(),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private secretKey(): Buffer {
    return createHash('sha256')
      .update(
        this.config.get('OAUTH_ENCRYPTION_KEY', { infer: true }) ??
          this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      )
      .digest();
  }
  private requireRedis(): Exclude<RedisClient, null> {
    if (!this.redis)
      throw new ServiceUnavailableException('OAuth 登录需要配置 Redis');
    return this.redis;
  }
  private stateKey(state: string): string {
    return `oauth:state:${state}`;
  }
  private ticketKey(ticket: string): string {
    return `oauth:ticket:${ticket}`;
  }
  private redirectUri(key: OAuthProviderKey): string {
    return `${this.config.get('OAUTH_REDIRECT_BASE_URL', { infer: true }).replace(/\/$/, '')}/${key}/callback`;
  }
  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private primitiveString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value))
      return String(value);
    return null;
  }
  private truncate(value: string | null, length: number): string | null {
    return value ? value.slice(0, length) : null;
  }
}
