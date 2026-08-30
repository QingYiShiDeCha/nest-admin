import { Injectable } from '@nestjs/common';
import { ClsService, type ClsStore } from 'nestjs-cls';

/** CLS 里存的内容。将来放 traceId 之类的也从这里扩展 */
export interface AppClsStore extends ClsStore {
  userId?: number;
  username?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * 请求级上下文。存在的意义是让 service 能拿到「当前是谁、从哪来」，
 * 而不必把 operatorId、ip 这些从 controller 一路当参数传到每个方法签名里。
 *
 * 底层是 AsyncLocalStorage（nestjs-cls），上下文由 ClsMiddleware 建立，
 * 内容由 RequestContextInterceptor 在认证守卫跑完之后写入。
 */
@Injectable()
export class RequestContext {
  constructor(private readonly cls: ClsService<AppClsStore>) {}

  /**
   * 当前操作人 id。以下情况返回 null，调用方要能接受：
   * - 尚未完成身份校验的 @Public() 接口
   * - seed、定时任务等非 HTTP 入口（压根没有 CLS 上下文）
   */
  get userId(): number | null {
    return this.read('userId');
  }

  get username(): string | null {
    return this.read('username');
  }

  /** 供已自行完成身份校验的公共接口补充操作人信息。 */
  setUser(userId: number, username: string): void {
    if (!this.cls.isActive()) return;

    this.cls.set('userId', userId);
    this.cls.set('username', username);
  }

  /** 客户端 IP，用于 refreshToken 的签发记录 */
  get ip(): string | null {
    return this.read('ip');
  }

  get userAgent(): string | null {
    return this.read('userAgent');
  }

  /** 签发会话记录时要带的客户端信息 */
  client(): { ip: string | null; userAgent: string | null } {
    return { ip: this.ip, userAgent: this.userAgent };
  }

  /** 插入时的审计字段 */
  auditOnCreate(): { createdBy: number | null; updatedBy: number | null } {
    const userId = this.userId;

    return { createdBy: userId, updatedBy: userId };
  }

  /** 更新（含软删除）时的审计字段 */
  auditOnUpdate(): { updatedBy: number | null } {
    return { updatedBy: this.userId };
  }

  private read<K extends keyof AppClsStore>(
    key: K,
  ): NonNullable<AppClsStore[K]> | null {
    if (!this.cls.isActive()) {
      return null;
    }

    return (
      (this.cls.get(key) as NonNullable<AppClsStore[K]> | undefined) ?? null
    );
  }
}
