import type { FileUploadResult } from '@nest-admin/shared';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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

import { OperationLog } from '../operation-log/operation-log.decorator';
import { FileService } from './file.service';

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
  ): Promise<FileUploadResult> {
    return this.service.upload(file);
  }
}
