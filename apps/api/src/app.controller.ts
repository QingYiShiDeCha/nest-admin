import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { AppService, type HealthStatus } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('系统')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 健康检查会被负载均衡和监控高频轮询，不该受全局限流影响
  @Public()
  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: '健康检查，含数据库连通性' })
  health(): Promise<HealthStatus> {
    return this.appService.health();
  }
}
