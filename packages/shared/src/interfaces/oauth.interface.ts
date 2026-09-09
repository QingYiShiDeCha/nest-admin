import type { OAuthProviderKey } from '../constants/oauth';

export interface OAuthProvider {
  id: number;
  key: OAuthProviderKey;
  name: string;
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  enabled: boolean;
  autoRegister: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthProviderPublic {
  key: OAuthProviderKey;
  name: string;
  icon: string;
}

export interface OAuthProviderPayload {
  key: OAuthProviderKey;
  name: string;
  clientId: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];
  enabled?: boolean;
  autoRegister?: boolean;
  sort?: number;
}
