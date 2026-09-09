import type { DrizzleDB } from '../../database/database.constants';
import { OAuthService } from './oauth.service';

const provider = {
  id: 1,
  key: 'github' as const,
  name: 'GitHub',
  clientId: 'client-id',
  clientSecretEncrypted: 'encrypted-secret',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scopes: JSON.stringify(['read:user']),
  enabled: true,
  autoRegister: false,
  sort: 0,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

function createService() {
  const limit = jest.fn().mockResolvedValue([provider]);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  const db = { select: jest.fn().mockReturnValue({ from }) };
  const redis = {
    set: jest.fn().mockResolvedValue('OK'),
    getdel: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        OAUTH_REDIRECT_BASE_URL: 'http://localhost:3000/api/auth/oauth',
        OAUTH_FRONTEND_CALLBACK_URL: 'http://localhost:5173/oauth/callback',
        OAUTH_ENCRYPTION_KEY: 'test-oauth-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      return values[key];
    }),
  };

  return {
    service: new OAuthService(
      db as unknown as DrizzleDB,
      redis as never,
      config as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ),
    redis,
  };
}

describe('OAuthService', () => {
  it('发起授权时写入短期 state 和 PKCE verifier', async () => {
    const { service, redis } = createService();

    const authorizationUrl = await service.authorize('github');
    const parsed = new URL(authorizationUrl);
    const setCalls = redis.set.mock.calls as unknown as unknown[][];
    const stateKey = setCalls[0]?.[0];
    const stateValue = setCalls[0]?.[1];
    const stateRecord = JSON.parse(stateValue as string) as {
      provider: string;
      codeVerifier: string;
    };

    expect(stateKey).toBe(`oauth:state:${parsed.searchParams.get('state')}`);
    expect(stateRecord.provider).toBe('github');
    expect(stateRecord.codeVerifier).toHaveLength(43);
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy();
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^oauth:state:/),
      expect.any(String),
      'EX',
      600,
    );
  });

  it('ticket 只能被消费一次', async () => {
    const { service, redis } = createService();
    const result = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
      passwordChangeRequired: false,
    };
    redis.getdel
      .mockResolvedValueOnce(JSON.stringify(result))
      .mockResolvedValueOnce(null);

    await expect(service.exchange('ticket-value')).resolves.toEqual(result);
    await expect(service.exchange('ticket-value')).rejects.toThrow(
      'OAuth 登录凭证已失效',
    );
    expect(redis.getdel).toHaveBeenCalledWith('oauth:ticket:ticket-value');
  });
});
