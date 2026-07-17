import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard applied to every route that requires a logged-in user. Per
 * docs/architecture/security.md ("Every mutating endpoint requires
 * authentication"), this should be the default on write endpoints across
 * every future module, not just auth/users.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {}
