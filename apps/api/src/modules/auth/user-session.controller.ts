import { PERMISSIONS } from '@nest-admin/shared';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { AuthService } from './auth.service';
import { SessionVo } from './dto/session.vo';
import type { AuthUser } from './interfaces/auth-user.interface';

/**
 * 管理员视角的会话管理。路由挂在 users 下（资源归属用户），
 * 实现放在 auth 模块——它操作的是 refreshToken。
 *
 * 与 /auth/sessions 的区别：那组接口只能操作自己的会话、不需要权限；
 * 这组能操作任意用户的，因而受权限码保护。
 */
@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UserSessionController {
  constructor(private readonly authService: AuthService) {}

  @Get(':id/sessions')
  @Permissions(PERMISSIONS.USER_SESSION_LIST)
  @ApiOperation({
    summary: '查看指定用户的在线设备',
    description:
      '只列出未吊销且未过期的会话。current 是相对查看者而言的——管理员查自己时才可能为 true。',
  })
  listUserSessions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() viewer: AuthUser,
  ): Promise<SessionVo[]> {
    return this.authService.listUserSessions(id, viewer.sessionId);
  }

  @Delete(':id/sessions/:sessionId')
  @Permissions(PERMISSIONS.USER_FORCE_LOGOUT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @OperationLog({ module: '用户管理', action: '下线用户的指定设备' })
  @ApiOperation({
    summary: '下线指定用户的某台设备',
    description:
      '比 force-logout 更精细，只踢一台。会话必须确实属于路径上的这个用户，否则返回 404。',
  })
  revokeUserSession(
    @Param('id', ParseIntPipe) id: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<void> {
    return this.authService.revokeUserSession(sessionId, id);
  }
}
