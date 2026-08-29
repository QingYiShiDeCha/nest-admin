import { PERMISSIONS } from '@nest-admin/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { apiLogin, apiLogout, apiProfile } from '@/api/auth';
import type { LoginPayload, UserProfile } from '@/api/types';
import { clearTokens, getTokens, saveTokens } from '@/utils/auth-token';

/** 权限码字面量的类型，直接取自 shared，写错编译期就报错 */
export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const useAuthStore = defineStore(
  'auth',
  () => {
    /**
     * 登录态标记。token 本身存在 localStorage 的独立键里（auth-token.ts），
     * 由 http 拦截器直接读写——它要在任何组件之外工作，不能依赖 pinia 实例。
     * 这里只持久化「是否登录过」，避免刷新页面时先闪一下登录页。
     */
    const loggedIn = ref(false);

    /** 服务端数据，不持久化：权限随时可能被后台改，缓存下来会导致越权显示 */
    const profile = ref<UserProfile | null>(null);

    const permissions = computed(() => profile.value?.permissions ?? []);
    const roles = computed(() => profile.value?.roles ?? []);
    const isSuperAdmin = computed(() => profile.value?.isSuperAdmin ?? false);
    const username = computed(() => profile.value?.username ?? '');

    /**
     * 是否拥有某个权限码。
     *
     * 超管必须短路：后端 PermissionGuard 对超管直接放行、profile 里的
     * permissions 返回空数组。这里不短路的话，超管会看不到任何按钮。
     */
    function hasPermission(code: PermissionCode | string): boolean {
      if (isSuperAdmin.value) {
        return true;
      }

      return permissions.value.includes(code);
    }

    /** 满足任意一个即可，与后端 @Permissions 传多个码的语义保持一致 */
    function hasAnyPermission(codes: (PermissionCode | string)[]): boolean {
      if (isSuperAdmin.value) {
        return true;
      }

      return codes.some((code) => permissions.value.includes(code));
    }

    async function login(payload: LoginPayload): Promise<void> {
      const result = await apiLogin(payload);

      saveTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      loggedIn.value = true;
      // 登录响应里的 user 不含角色权限，必须再拉一次 profile
      await loadProfile();
    }

    async function loadProfile(): Promise<UserProfile> {
      const data = await apiProfile();

      profile.value = data;
      loggedIn.value = true;

      return data;
    }

    /**
     * 登出。即使后端调用失败也要清本地状态——用户点了登出就该退出去，
     * 不能因为网络问题把人困在里面。后端对无效令牌本身也返回成功。
     */
    async function logout(): Promise<void> {
      const refreshToken = getTokens()?.refreshToken;

      if (refreshToken) {
        await apiLogout(refreshToken).catch(() => undefined);
      }

      reset();
    }

    /** 清空本地登录态，401 兜底和登出都走这里 */
    function reset(): void {
      clearTokens();
      profile.value = null;
      loggedIn.value = false;
    }

    return {
      loggedIn,
      profile,
      permissions,
      roles,
      isSuperAdmin,
      username,
      hasPermission,
      hasAnyPermission,
      login,
      loadProfile,
      logout,
      reset,
    };
  },
  {
    // 只持久化 loggedIn。profile 是服务端权限数据，缓存它等于让「后台刚
    // 撤掉的权限」在前端继续生效一段时间，每次进应用都重新拉才安全。
    persist: { pick: ['loggedIn'] },
  },
);
