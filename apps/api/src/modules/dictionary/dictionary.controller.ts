import type {
  DictionaryItemRow,
  DictionaryTypeRow,
} from '@nest-admin/database';
import {
  PERMISSIONS,
  type DictionaryOption,
  type PaginatedResult,
} from '@nest-admin/shared';
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
import { DictionaryService } from './dictionary.service';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { CreateDictionaryTypeDto } from './dto/create-dictionary-type.dto';
import { QueryDictionaryItemDto } from './dto/query-dictionary-item.dto';
import { QueryDictionaryTypeDto } from './dto/query-dictionary-type.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { UpdateDictionaryTypeDto } from './dto/update-dictionary-type.dto';

@ApiTags('数据字典')
@ApiBearerAuth()
@Controller('dictionary-types')
export class DictionaryTypeController {
  constructor(private readonly service: DictionaryService) {}

  @Get()
  @Permissions(PERMISSIONS.DICT_LIST)
  @ApiOperation({ summary: '分页查询字典类型' })
  findPage(
    @Query() query: QueryDictionaryTypeDto,
  ): Promise<PaginatedResult<DictionaryTypeRow>> {
    return this.service.findTypePage(query);
  }

  @Post()
  @Permissions(PERMISSIONS.DICT_CREATE)
  @OperationLog({ module: '数据字典', action: '新增字典类型' })
  @ApiOperation({ summary: '新增字典类型' })
  create(@Body() dto: CreateDictionaryTypeDto): Promise<DictionaryTypeRow> {
    return this.service.createType(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.DICT_READ)
  @ApiOperation({ summary: '查询字典类型详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<DictionaryTypeRow> {
    return this.service.findTypeDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DICT_UPDATE)
  @OperationLog({ module: '数据字典', action: '更新字典类型' })
  @ApiOperation({ summary: '更新字典类型' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictionaryTypeDto,
  ): Promise<DictionaryTypeRow> {
    return this.service.updateType(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.DICT_DELETE)
  @OperationLog({ module: '数据字典', action: '删除字典类型' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除字典类型及其字典项' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.removeType(id);
  }

  @Get(':id/items')
  @Permissions(PERMISSIONS.DICT_LIST)
  @ApiOperation({ summary: '查询字典类型下的字典项' })
  findItems(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryDictionaryItemDto,
  ): Promise<DictionaryItemRow[]> {
    return this.service.findItems(id, query);
  }

  @Post(':id/items')
  @Permissions(PERMISSIONS.DICT_CREATE)
  @OperationLog({ module: '数据字典', action: '新增字典项' })
  @ApiOperation({ summary: '新增字典项' })
  createItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDictionaryItemDto,
  ): Promise<DictionaryItemRow> {
    return this.service.createItem(id, dto);
  }
}

@ApiTags('数据字典')
@ApiBearerAuth()
@Controller('dictionary-items')
export class DictionaryItemController {
  constructor(private readonly service: DictionaryService) {}

  @Patch(':id')
  @Permissions(PERMISSIONS.DICT_UPDATE)
  @OperationLog({ module: '数据字典', action: '更新字典项' })
  @ApiOperation({ summary: '更新字典项' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictionaryItemDto,
  ): Promise<DictionaryItemRow> {
    return this.service.updateItem(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.DICT_DELETE)
  @OperationLog({ module: '数据字典', action: '删除字典项' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除字典项' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.removeItem(id);
  }
}

@ApiTags('数据字典')
@ApiBearerAuth()
@Controller('dictionaries')
export class DictionaryConsumerController {
  constructor(private readonly service: DictionaryService) {}

  @Get(':code')
  @ApiOperation({ summary: '按编码查询启用字典项' })
  findOptions(@Param('code') code: string): Promise<DictionaryOption[]> {
    return this.service.getEnabledOptions(code);
  }
}
