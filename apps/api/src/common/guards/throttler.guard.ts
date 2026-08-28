import { Injectable, Logger } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  type ThrottlerRequest,
} from '@nestjs/throttler';

/**
 * 在默认守卫基础上做两件事：把 429 的提示换成中文，以及存储故障时放行。
 *
 * 注册在全局守卫链的最前面（见 AppModule）：限流应当先于认证执行，
 * 否则每次暴力尝试都会先做一遍查库和 bcrypt 比对，
 * 防护本身反而成了最贵的一环。
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AppThrottlerGuard.name);

  /**
   * 计数存储故障时选择放行（fail-open）而不是拒绝。
   *
   * 换用 Redis 之后，限流从「进程内一个 Map」变成了外部依赖。
   * 如果 Redis 抖动就让所有请求 500，等于给系统加了一个新的单点——
   * 为了防暴力破解而让整站不可用，代价明显不成比例。
   * 这里的取舍是：宁可短时间失去限流保护，也要保住可用性，
   * 同时打 error 日志让运维立刻能看见。
   *
   * 注意只吞存储异常，ThrottlerException 是「确实超限」的正常结果，必须放行上抛。
   */
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw error;
      }

      this.logger.error(
        `限流存储不可用，本次请求已放行：${error instanceof Error ? error.message : String(error)}`,
      );

      return true;
    }
  }

  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('请求过于频繁，请稍后再试');
  }
}
