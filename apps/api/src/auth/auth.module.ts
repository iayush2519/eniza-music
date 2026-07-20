import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ACTIVE_OTP_DELIVERY_PROVIDER } from './otp/otp.constants';
import { ConsoleOtpProvider } from './otp/console-otp-provider';
import { EmailOtpProvider } from './otp/email-otp-provider';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EnvironmentVariables } from '../config/env.validation';
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
    EmailOtpProvider,
    LocalStrategy,
    JwtAccessStrategy,
    // Provider selection follows the exact same shape as
    // `ACTIVE_MUSIC_PROVIDER` in discovery.module.ts: `OtpService`
    // injects the `ACTIVE_OTP_DELIVERY_PROVIDER` token, never a concrete
    // provider class. `EmailOtpProvider` (real SMTP delivery via
    // Nodemailer) is selected when `SMTP_HOST` is configured;
    // `ConsoleOtpProvider` remains the fallback for local dev and every
    // test (`jest-e2e-setup.ts` never sets `SMTP_HOST`). Adding a further
    // provider later means adding it to `providers` above and extending
    // this factory — no change to `OtpService` or any auth endpoint.
    {
      provide: ACTIVE_OTP_DELIVERY_PROVIDER,
      inject: [ConfigService, ConsoleOtpProvider, EmailOtpProvider],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        consoleProvider: ConsoleOtpProvider,
        emailProvider: EmailOtpProvider,
      ) => (config.get('SMTP_HOST', { infer: true }) ? emailProvider : consoleProvider),
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
