import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import type { DepartmentTransferRow } from '@nest-admin/database';
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

import { Permissions } from '../../common/decorators/permissions.decorator';
import { OperationLog } from '../operation-log/operation-log.decorator';
import {
  DepartmentService,
  type DepartmentRecord,
  type DepartmentTreeNode,
} from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { QueryDepartmentTransferDto } from './dto/query-department-transfer.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('部门管理')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}

  @Get()
  @Permissions(
    PERMISSIONS.DEPT_LIST,
    PERMISSIONS.USER_LIST,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_UPDATE,
  )
  @ApiOperation({ summary: '查询部门树，搜索结果保留祖先节点' })
  findTree(@Query() query: QueryDepartmentDto): Promise<DepartmentTreeNode[]> {
    return this.service.findTree(query);
  }

  @Post()
  @Permissions(PERMISSIONS.DEPT_CREATE)
  @OperationLog({ module: '部门管理', action: '新增部门' })
  @ApiOperation({ summary: '新增部门' })
  create(@Body() dto: CreateDepartmentDto): Promise<DepartmentRecord> {
    return this.service.create(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.DEPT_READ)
  @ApiOperation({ summary: '查询部门详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<DepartmentRecord> {
    return this.service.findDetail(id);
  }

  @Get(':id/transfers')
  @Permissions(PERMISSIONS.DEPT_TRANSFER_LIST)
  @ApiOperation({ summary: '分页查询部门迁移历史' })
  findTransfers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryDepartmentTransferDto,
  ): Promise<PaginatedResult<DepartmentTransferRow>> {
    return this.service.findTransfers(id, query);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DEPT_UPDATE)
  @OperationLog({ module: '部门管理', action: '更新部门' })
  @ApiOperation({ summary: '更新部门' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentRecord> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.DEPT_DELETE)
  @OperationLog({ module: '部门管理', action: '删除部门' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除无子部门且无直属用户的部门' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
