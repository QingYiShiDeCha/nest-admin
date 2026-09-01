import type { SystemConfigRow } from '@nest-admin/database';
import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { QuerySystemConfigDto } from './dto/query-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfigService } from './system-config.service';

@ApiTags('系统参数')
@ApiBearerAuth()
@Controller('system-configs')
export class SystemConfigController {
  constructor(private readonly service: SystemConfigService) {}

  @Get()
  @Permissions(PERMISSIONS.CONFIG_LIST)
  @ApiOperation({ summary: '分页查询系统参数' })
  findPage(
    @Query() query: QuerySystemConfigDto,
  ): Promise<PaginatedResult<SystemConfigRow>> {
    return this.service.findPage(query);
  }

  @Get('runtime')
  @Public()
  @ApiOperation({ summary: '查询公开运行时参数' })
  getRuntimeConfig() {
    return this.service.getRuntimeConfig();
  }

  @Post()
  @Permissions(PERMISSIONS.CONFIG_CREATE)
  @OperationLog({ module: '系统参数', action: '新增参数' })
  @ApiOperation({ summary: '新增系统参数' })
  create(@Body() dto: CreateSystemConfigDto): Promise<SystemConfigRow> {
    return this.service.create(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CONFIG_READ)
  @ApiOperation({ summary: '查询系统参数详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SystemConfigRow> {
    return this.service.findDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CONFIG_UPDATE)
  @OperationLog({ module: '系统参数', action: '更新参数' })
  @ApiOperation({ summary: '更新系统参数' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemConfigDto,
  ): Promise<SystemConfigRow> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CONFIG_DELETE)
  @OperationLog({ module: '系统参数', action: '删除参数' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除非内置系统参数' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
