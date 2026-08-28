import { PartialType } from '@nestjs/swagger';

import { CreateRoleDto } from './create-role.dto';

/**
 * 所有字段可选。内置角色（is_system）的 code 与 status 不允许改动，
 * 由 RoleService 拦截而非在这里用类型限制——因为是否内置取决于运行时数据。
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
