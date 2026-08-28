import { Test, type TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService, type HealthStatus } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  const health: HealthStatus = { status: 'ok', database: 'up', uptime: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    })
      // 用桩替掉 AppService，避免单元测试依赖真实数据库
      .useMocker((token) =>
        token === AppService
          ? { health: jest.fn().mockResolvedValue(health) }
          : undefined,
      )
      .compile();

    controller = module.get(AppController);
  });

  it('健康检查返回数据库状态', async () => {
    await expect(controller.health()).resolves.toEqual(health);
  });
});
