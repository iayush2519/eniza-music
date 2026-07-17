import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AccessTokenPayload } from '../types/jwt-payload.type';
import { EnvironmentVariables } from '../../config/env.validation';
import { User } from '../../database/schema';
import { UsersService } from '../../users/users.service';

/**
 * Validates the `Authorization: Bearer <accessToken>` header on every
 * guarded route. Re-fetches the user from the DB on every request (rather
 * than trusting the token payload alone) so a deactivated/deleted account
 * is rejected immediately rather than only once the token naturally
 * expires.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return user;
  }
}
