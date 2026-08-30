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

import { Permissions } from '../../common/decorators/permissions.decorator';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { QueryNoticeDto } from './dto/query-notice.dto';
import { QueryNoticeTargetDto } from './dto/query-notice-target.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import {
  NoticeService,
  type NoticeDetailRecord,
  type NoticeListRecord,
} from './notice.service';

@ApiTags('通知公告')
@ApiBearerAuth()
@Controller('notices')
export class NoticeController {
  constructor(private readonly service: NoticeService) {}

  @Get()
  @Permissions(PERMISSIONS.NOTICE_LIST)
  @ApiOperation({ summary: '分页查询通知公告' })
  findPage(
    @Query() query: QueryNoticeDto,
  ): Promise<PaginatedResult<NoticeListRecord>> {
    return this.service.findPage(query);
  }

  @Get('target-options')
  @Permissions(PERMISSIONS.NOTICE_CREATE, PERMISSIONS.NOTICE_UPDATE)
  @ApiOperation({ summary: '查询公告可选接收对象' })
  findTargetOptions(@Query() query: QueryNoticeTargetDto) {
    return this.service.findTargetOptions(query);
  }

  @Post()
  @Permissions(PERMISSIONS.NOTICE_CREATE)
  @OperationLog({ module: '通知公告', action: '新增公告' })
  @ApiOperation({ summary: '新增公告草稿' })
  create(@Body() dto: CreateNoticeDto): Promise<NoticeDetailRecord> {
    return this.service.create(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.NOTICE_READ)
  @ApiOperation({ summary: '查询公告详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<NoticeDetailRecord> {
    return this.service.findDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.NOTICE_UPDATE)
  @OperationLog({ module: '通知公告', action: '更新公告' })
  @ApiOperation({ summary: '更新未发布或已撤回公告' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoticeDto,
  ): Promise<NoticeDetailRecord> {
    return this.service.update(id, dto);
  }

  @Post(':id/publish')
  @Permissions(PERMISSIONS.NOTICE_PUBLISH)
  @OperationLog({ module: '通知公告', action: '发布公告' })
  @ApiOperation({ summary: '发布公告并生成收件人快照' })
  publish(@Param('id', ParseIntPipe) id: number): Promise<NoticeDetailRecord> {
    return this.service.publish(id);
  }

  @Post(':id/withdraw')
  @Permissions(PERMISSIONS.NOTICE_WITHDRAW)
  @OperationLog({ module: '通知公告', action: '撤回公告' })
  @ApiOperation({ summary: '撤回已发布公告' })
  withdraw(@Param('id', ParseIntPipe) id: number): Promise<NoticeDetailRecord> {
    return this.service.withdraw(id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.NOTICE_DELETE)
  @OperationLog({ module: '通知公告', action: '删除公告' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除未发布或已撤回公告' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
