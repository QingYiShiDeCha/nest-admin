import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记接口无需登录。全局挂了 JwtAuthGuard，
 * 所以登录、注册、健康检查这类接口必须显式加上它。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
