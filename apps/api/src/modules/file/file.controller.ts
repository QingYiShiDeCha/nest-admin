import {
  PERMISSIONS,
  type FileUploadResult,
  type PaginatedResult,
} from '@nest-admin/shared';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { QueryFileResourceDto } from './dto/query-file-resource.dto';
import { FileService, type FileResourceRecord } from './file.service';

@ApiTags('文件')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(private readonly service: FileService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @OperationLog({ module: '文件管理', action: '上传文件' })
  @ApiOperation({ summary: '上传单个文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<FileUploadResult> {
    return this.service.upload(file, user);
  }

  @Get('resources')
  @Permissions(PERMISSIONS.FILE_LIST)
  @ApiOperation({ summary: '分页查询文件资源' })
  findPage(
    @Query() query: QueryFileResourceDto,
  ): Promise<PaginatedResult<FileResourceRecord>> {
    return this.service.findPage(query);
  }

  @Get('resources/mine')
  @ApiOperation({ summary: '分页查询当前用户上传的文件资源' })
  findMyPage(
    @Query() query: QueryFileResourceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResult<FileResourceRecord>> {
    return this.service.findMyPage(query, user.id);
  }

  @Get('resources/:id')
  @Permissions(PERMISSIONS.FILE_READ)
  @ApiOperation({ summary: '查询文件资源详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<FileResourceRecord> {
    return this.service.findById(id);
  }

  @Delete('resources/:id')
  @Permissions(PERMISSIONS.FILE_DELETE)
  @OperationLog({ module: '文件资源', action: '删除文件' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除未被业务引用的文件资源' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
