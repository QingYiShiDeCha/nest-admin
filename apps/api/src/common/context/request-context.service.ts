import { Injectable } from '@nestjs/common';
import { ClsService, type ClsStore } from 'nestjs-cls';

/** CLS 里存的内容。目前只有当前操作人，将来放 traceId 之类的也从这里扩展 */
export interface AppClsStore extends ClsStore {
  userId?: number;
}

/**
 * 请求级上下文。存在的意义是让 service 能拿到「当前是谁在操作」，
 * 而不必把 operatorId 从 controller 一路当参数传到每个方法签名里。
 *
 * 底层是 AsyncLocalStorage（nestjs-cls），上下文由 ClsMiddleware 建立，
 * userId 由 CurrentUserInterceptor 在认证守卫跑完之后写入。
 */
@Injectable()
export class RequestContext {
  constructor(private readonly cls: ClsService<AppClsStore>) {}

  /**
   * 当前操作人 id。以下情况返回 null，调用方要能接受：
   * - @Public() 接口（没有登录态）
   * - seed、定时任务等非 HTTP 入口（压根没有 CLS 上下文）
   */
  get userId(): number | null {
    if (!this.cls.isActive()) {
      return null;
    }

    return this.cls.get('userId') ?? null;
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
}
