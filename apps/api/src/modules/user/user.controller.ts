import type { SafeUser } from '@nest-admin/database';
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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OperationLog } from '../../modules/operation-log/operation-log.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions(PERMISSIONS.USER_CREATE)
  @OperationLog({ module: '用户管理', action: '新增用户' })
  @ApiOperation({ summary: '新增用户' })
  create(@Body() dto: CreateUserDto): Promise<SafeUser> {
    return this.userService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.USER_LIST)
  @ApiOperation({ summary: '分页查询用户' })
  findPage(@Query() query: QueryUserDto): Promise<PaginatedResult<SafeUser>> {
    return this.userService.findPage(query);
  }

  // 改自己的密码不需要用户管理权限，任何登录用户都可以
  @Put('me/password')
  @OperationLog({ module: '用户管理', action: '修改自己的密码' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '修改当前登录用户的密码' })
  changeOwnPassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.userService.changePassword(userId, dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USER_READ)
  @ApiOperation({ summary: '查询用户详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SafeUser> {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USER_UPDATE)
  @OperationLog({ module: '用户管理', action: '更新用户' })
  @ApiOperation({ summary: '更新用户' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<SafeUser> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USER_DELETE)
  @OperationLog({ module: '用户管理', action: '删除用户' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.userService.remove(id);
  }
}
