import { serializeParams } from './redact';

/**
 * 脱敏是这个模块唯一不能出错的地方：登录失败的请求也会被记录，
 * 而它的 body 里正好是明文密码。这里逐种形态都覆盖一遍。
 */
describe('serializeParams 脱敏', () => {
  const parse = (input: unknown) =>
    JSON.parse(serializeParams(input) ?? 'null') as Record<string, unknown>;

  it('顶层敏感字段被替换', () => {
    expect(parse({ username: 'admin', password: 'admin123456' })).toEqual({
      username: 'admin',
      password: '***',
    });
  });

  it('嵌套对象里的敏感字段同样被替换', () => {
    const result = parse({ body: { username: 'a', password: 'p@ss' } });

    expect(result).toEqual({ body: { username: 'a', password: '***' } });
  });

  it('数组元素里的敏感字段被替换', () => {
    const result = parse({ users: [{ name: 'a', password: 'x' }] });

    expect(result).toEqual({ users: [{ name: 'a', password: '***' }] });
  });

  it('覆盖 token / secret / authorization / cookie 等命名', () => {
    const result = parse({
      accessToken: 'a',
      refreshToken: 'b',
      clientSecret: 'c',
      authorization: 'd',
      cookie: 'e',
      credentials: 'f',
    });

    expect(Object.values(result)).toEqual(Array<string>(6).fill('***'));
  });

  it('大小写混写也能命中', () => {
    expect(parse({ PassWord: 'x', ACCESS_TOKEN: 'y' })).toEqual({
      PassWord: '***',
      ACCESS_TOKEN: '***',
    });
  });

  it('原始输出里不出现明文密码', () => {
    const raw = serializeParams({
      body: { password: 'super-secret-value', nested: { pwd: 'x' } },
    });

    expect(raw).not.toContain('super-secret-value');
  });

  it('超长内容被截断，避免撑爆 TEXT 列', () => {
    const raw = serializeParams({ note: 'x'.repeat(5000) });

    expect(raw!.length).toBeLessThan(2100);
    expect(raw).toContain('已截断');
  });

  it('空对象返回 null，不写无意义的日志', () => {
    expect(serializeParams({})).toBeNull();
  });

  it('循环引用不会抛错', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;

    expect(() => serializeParams(cyclic)).not.toThrow();
  });
});
