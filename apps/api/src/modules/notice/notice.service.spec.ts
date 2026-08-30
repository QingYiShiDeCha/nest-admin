import { BadRequestException } from '@nestjs/common';

import { validateTargetSelection } from './notice.service';

describe('validateTargetSelection', () => {
  it('全员公告不能夹带定向对象', () => {
    expect(() => validateTargetSelection('all', [1])).toThrow(
      new BadRequestException('全员公告不能指定接收对象'),
    );
  });

  it('定向公告至少选择一个接收对象', () => {
    expect(() => validateTargetSelection('department', [])).toThrow(
      new BadRequestException('定向公告至少选择一个接收对象'),
    );
  });

  it.each([
    ['all', []],
    ['department', [1]],
    ['role', [2]],
    ['user', [3]],
  ] as const)('%s 接收范围通过基本校验', (targetType, ids) => {
    expect(() => validateTargetSelection(targetType, [...ids])).not.toThrow();
  });
});
