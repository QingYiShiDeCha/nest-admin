import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * 只为把 429 的提示换成中文。@nestjs/throttler 默认抛
 * "ThrottlerException: Too Many Requests"，会被 AllExceptionsFilter 原样透出。
 *
 * 注册在全局守卫链的最前面（见 AppModule）：限流应当先于认证执行，
 * 否则每次暴力尝试都会先做一遍查库和 bcrypt 比对，
 * 防护本身反而成了最贵的一环。
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('请求过于频繁，请稍后再试');
  }
}
