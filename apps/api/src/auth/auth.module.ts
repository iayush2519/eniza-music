import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ACTIVE_OTP_DELIVERY_PROVIDER } from './otp/otp.constants';
import { ConsoleOtpProvider } from './otp/console-otp-provider';
import { OtpService } from './otp/otp.service';
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
  providers: [
    AuthService,
    SessionsService,
    PasswordService,
    OtpService,
    ConsoleOtpProvider,
    LocalStrategy,
    JwtAccessStrategy,
    // Provider selection follows the exact same shape as
    // `ACTIVE_MUSIC_PROVIDER` in discovery.module.ts: `OtpService`
    // injects the `ACTIVE_OTP_DELIVERY_PROVIDER` token, never a concrete
    // provider class. `ConsoleOtpProvider` is the only implementation
    // registered for this development phase (see its own doc comment for
    // why a real email/SMS provider hasn't been added yet); adding one
    // later means adding it to `providers` above and switching this
    // factory to select it when its config is present — no change to
    // `OtpService` or any auth endpoint.
    {
      provide: ACTIVE_OTP_DELIVERY_PROVIDER,
      inject: [ConsoleOtpProvider],
      useFactory: (consoleProvider: ConsoleOtpProvider) => consoleProvider,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
