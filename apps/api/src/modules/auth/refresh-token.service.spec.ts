import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  it('主动退出时物理删除当前有效会话', async () => {
    const where = jest.fn().mockResolvedValue(undefined);
    const db = {
      delete: jest.fn().mockReturnValue({ where }),
      update: jest.fn(),
    };
    const service = new RefreshTokenService(db as never);

    await service.revoke('current-jti');

    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
  });
});
