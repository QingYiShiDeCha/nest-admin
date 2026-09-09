export const OAUTH_PROVIDER_KEYS = ['github', 'dingtalk', 'wechat'] as const;

export type OAuthProviderKey = (typeof OAUTH_PROVIDER_KEYS)[number];

export const OAUTH_PROVIDER_META: Record<
  OAuthProviderKey,
  { label: string; icon: string }
> = {
  github: { label: 'GitHub', icon: 'i-ri:github-fill' },
  dingtalk: { label: '钉钉', icon: 'i-ri:dingding-fill' },
  wechat: { label: '微信', icon: 'i-ri:wechat-fill' },
};
