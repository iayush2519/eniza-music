import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Registered without options here: AuthService signs/verifies tokens
    // with explicit secrets/expirations per token type (access vs.
    // refresh) rather than a single module-wide default, since the two
    // token types intentionally use different secrets and lifetimes.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionsService, PasswordService, LocalStrategy, JwtAccessStrategy],
  exports: [AuthService],
})
export class AuthModule {}
