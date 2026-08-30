import type { PostRow } from '@nest-admin/database';
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
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostService, type PostListRecord } from './post.service';

@ApiTags('岗位管理')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  constructor(private readonly service: PostService) {}

  @Get()
  @Permissions(PERMISSIONS.POST_LIST, PERMISSIONS.USER_ASSIGN_POST)
  @ApiOperation({ summary: '分页查询岗位' })
  findPage(
    @Query() query: QueryPostDto,
  ): Promise<PaginatedResult<PostListRecord>> {
    return this.service.findPage(query);
  }

  @Post()
  @Permissions(PERMISSIONS.POST_CREATE)
  @OperationLog({ module: '岗位管理', action: '新增岗位' })
  @ApiOperation({ summary: '新增岗位' })
  create(@Body() dto: CreatePostDto): Promise<PostRow> {
    return this.service.create(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.POST_READ)
  @ApiOperation({ summary: '查询岗位详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PostRow> {
    return this.service.findDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.POST_UPDATE)
  @OperationLog({ module: '岗位管理', action: '更新岗位' })
  @ApiOperation({ summary: '更新岗位' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ): Promise<PostRow> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.POST_DELETE)
  @OperationLog({ module: '岗位管理', action: '删除岗位' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除未分配用户的岗位' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
