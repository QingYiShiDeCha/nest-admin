import type { DashboardStatistics } from '@nest-admin/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { StatisticsService } from './statistics.service';

@ApiTags('首页统计')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  /**
   * 首页菜单对所有登录用户可见（seed 里不挂权限码），统计接口保持一致：
   * 只要求登录，不给任何角色补授权也能打开首页。
   */
  @Get('dashboard')
  @ApiOperation({ summary: '查询首页统计概览' })
  dashboard(): Promise<DashboardStatistics> {
    return this.service.dashboard();
  }
}
