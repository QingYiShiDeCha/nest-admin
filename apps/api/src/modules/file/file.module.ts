import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import type { Env } from '../../config/env.validation';
import { FileController } from './file.controller';
import { createFileStorage } from './file-storage.factory';
import { FILE_STORAGE } from './file-storage.interface';
import { FileService } from './file.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        storage: memoryStorage(),
        limits: {
          fileSize:
            config.get('UPLOAD_MAX_FILE_SIZE_MB', { infer: true }) *
            1024 *
            1024,
          files: 1,
        },
      }),
    }),
  ],
  controllers: [FileController],
  providers: [
    FileService,
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: createFileStorage,
    },
  ],
})
export class FileModule {}
