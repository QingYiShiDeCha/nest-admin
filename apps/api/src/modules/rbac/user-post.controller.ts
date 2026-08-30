import { PERMISSIONS } from '@nest-admin/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { AssignIdsDto } from './dto/assign-ids.dto';
import { PostService } from './post.service';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UserPostController {
  constructor(private readonly service: PostService) {}

  @Get(':id/posts')
  @Permissions(PERMISSIONS.USER_ASSIGN_POST)
  @ApiOperation({ summary: '查询用户已分配的岗位 id' })
  findUserPosts(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<number[]> {
    return this.service.findUserPostIds(id, user);
  }

  @Put(':id/posts')
  @Permissions(PERMISSIONS.USER_ASSIGN_POST)
  @OperationLog({ module: '用户管理', action: '分配用户岗位' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '全量替换用户岗位' })
  setUserPosts(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignIdsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.service.setUserPosts(id, dto.ids, user);
  }
}
