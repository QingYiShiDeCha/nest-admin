import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateOwnProfileDto } from './update-own-profile.dto';

describe('UpdateOwnProfileDto', () => {
  it('修剪资料字段并允许用 null 清空', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      nickname: '  清茶  ',
      email: '  user@example.com ',
      phone: null,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual({
      nickname: '清茶',
      email: 'user@example.com',
      phone: null,
    });
  });

  it('拒绝空白昵称、非法邮箱和手机号', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      nickname: '   ',
      email: 'invalid-email',
      phone: '123456',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'email',
      'nickname',
      'phone',
    ]);
  });
});
