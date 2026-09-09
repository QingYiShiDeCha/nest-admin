import type {
  OAuthProvider,
  OAuthProviderKey,
  OAuthProviderPayload,
  OAuthProviderPublic,
  PaginatedResult,
} from '@nest-admin/shared';

import { httpDelete, httpGet, httpPatch, httpPost, withQuery } from '@/api/http';

export type OAuthProviderQuery = object;

export function apiOAuthProviderPage(
  query: OAuthProviderQuery,
): Promise<PaginatedResult<OAuthProvider>> {
  return httpGet(withQuery('/oauth/providers', { ...query }));
}

export function apiOAuthProviderEnabled(): Promise<OAuthProviderPublic[]> {
  return httpGet('/auth/oauth/providers');
}

export function apiOAuthProviderCreate(
  payload: OAuthProviderPayload & { clientSecret: string },
): Promise<OAuthProvider> {
  return httpPost('/oauth/providers', payload);
}

export function apiOAuthProviderUpdate(
  id: number,
  payload: Partial<OAuthProviderPayload>,
): Promise<OAuthProvider> {
  return httpPatch(`/oauth/providers/${id}`, payload);
}

export function apiOAuthProviderRemove(id: number): Promise<void> {
  return httpDelete(`/oauth/providers/${id}`);
}

export function apiOAuthExchange(ticket: string) {
  return httpPost<{
    accessToken: string;
    refreshToken: string;
    user: unknown;
    passwordChangeRequired: boolean;
  }>('/auth/oauth/exchange', { ticket });
}

export function oauthAuthorizeUrl(key: OAuthProviderKey): string {
  const base = import.meta.env.VITE_API_BASE || '/api';
  return `${base.replace(/\/$/, '')}/auth/oauth/${key}`;
}
