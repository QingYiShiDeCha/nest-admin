import { PERMISSIONS, type SystemMonitorOverview } from '@nest-admin/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { SystemMonitorService } from './system-monitor.service';

@ApiTags('系统监控')
@ApiBearerAuth()
@Controller('system-monitor')
export class SystemMonitorController {
  constructor(private readonly service: SystemMonitorService) {}

  @Get('overview')
  @Permissions(PERMISSIONS.MONITOR_READ)
  @ApiOperation({ summary: '查询系统运行监控概览' })
  overview(): Promise<SystemMonitorOverview> {
    return this.service.overview();
  }
}
