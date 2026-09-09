import { PartialType } from '@nestjs/swagger';

import { CreateOAuthProviderDto } from './create-oauth-provider.dto';

export class UpdateOAuthProviderDto extends PartialType(
  CreateOAuthProviderDto,
) {}
