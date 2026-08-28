import { PartialType } from '@nestjs/swagger';

import { CreateMenuDto } from './create-menu.dto';

/**
 * 所有字段可选。改 parentId 时 MenuService 会校验不能指向自己或自己的后代，
 * 否则会把子树从主干上摘下来形成环。
 */
export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
