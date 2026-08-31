import { Module } from '@nestjs/common';

import { DictionaryCacheService } from './dictionary-cache.service';
import {
  DictionaryConsumerController,
  DictionaryItemController,
  DictionaryTypeController,
} from './dictionary.controller';
import { DictionaryService } from './dictionary.service';

@Module({
  controllers: [
    DictionaryTypeController,
    DictionaryItemController,
    DictionaryConsumerController,
  ],
  providers: [DictionaryCacheService, DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}
