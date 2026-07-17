import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { PasswordService } from '../password.service';
import { User } from '../../database/schema';
import { UsersService } from '../../users/users.service';

/**
 * Validates email+password credentials on `/auth/login`. Kept as a
 * Passport strategy (the standard NestJS pattern for this) rather than
 * inline controller logic so credential validation is independently
 * testable and reusable if a second login surface (e.g. an admin panel)
 * is ever added.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
