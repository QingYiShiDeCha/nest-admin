import { PERMISSIONS, type PermissionCatalogItem } from '@nest-admin/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionService } from './permission.service';

/**
 * 权限码目录只读。权限码由代码定义、seed 录入，
 * 不提供增删改接口——它必须与 controller 上的 @Permissions() 标注一一对应，
 * 允许在界面上随意增删只会造出一批对不上任何接口的死数据。
 */
@ApiTags('权限管理')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @Permissions(PERMISSIONS.PERMISSION_LIST)
  @ApiOperation({
    summary: '查询权限码目录',
    description: '供角色授权界面拉取可选项，前端按 module 字段分组展示',
  })
  findCatalog(): Promise<PermissionCatalogItem[]> {
    return this.permissionService.findCatalog();
  }
}
