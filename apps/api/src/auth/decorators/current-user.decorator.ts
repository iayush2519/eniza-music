import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { User } from '../../database/schema';

/**
 * Extracts the authenticated user (attached to the request by
 * `JwtAuthGuard` -> `JwtAccessStrategy.validate`) in a controller handler:
 *
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   me(@CurrentUser() user: User) { ... }
 */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<{ user: User }>();
  return request.user;
});
