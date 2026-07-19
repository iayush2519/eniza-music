import { Controller, Get, UseGuards } from '@nestjs/common';

import { UserProfileDto } from '../auth/dto/auth-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../database/schema';

/**
 * `GET /users/me` lets a client rehydrate "who am I logged in as" from a
 * stored access token — e.g. on mobile app cold start, when the app has
 * an access token but no in-memory user profile yet. Reuses
 * `UserProfileDto`/`toUserProfileDto` from the auth module rather than
 * introducing a second user-shape mapping.
 */
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  @Get('me')
  me(@CurrentUser() user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isArtist: user.isArtist,
      emailVerified: user.emailVerified,
    };
  }
}
