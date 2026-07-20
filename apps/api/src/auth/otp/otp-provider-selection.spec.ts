import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../auth.module';
import { ACTIVE_OTP_DELIVERY_PROVIDER } from './otp.constants';
import { ConsoleOtpProvider } from './console-otp-provider';
import { EmailOtpProvider } from './email-otp-provider';
import type { OtpDeliveryProvider } from './otp-delivery.interface';
import { validateEnv } from '../../config/env.validation';
import { DATABASE_CONNECTION } from '../../database/database.constants';

/**
 * A minimal stand-in for the Drizzle connection — `AuthModule` pulls in
 * `UsersModule`/`SessionsService`, which inject `DATABASE_CONNECTION`,
 * but nothing in this test actually queries the database; it only
 * resolves the module graph to inspect which `OtpDeliveryProvider` the
 * `ACTIVE_OTP_DELIVERY_PROVIDER` factory selected. Every chained method
 * returns the stub itself so any call shape compiles without a real
 * schema/query builder.
 */
function createFakeDb(): unknown {
  const chain: Record<string, unknown> = {};
  const self = (): unknown => chain;
  chain.select = self;
  chain.from = self;
  chain.where = self;
  chain.orderBy = self;
  chain.limit = () => Promise.resolve([]);
  chain.insert = self;
  chain.values = self;
  chain.returning = () => Promise.resolve([]);
  chain.update = self;
  chain.set = self;
  return chain;
}

/**
 * A stand-in for the real (also `@Global()`) `DatabaseModule` — `AuthModule`
 * never imports `DatabaseModule` itself (it's global, per
 * database.module.ts's own doc comment), so this test needs its own
 * global provider of `DATABASE_CONNECTION` in the module graph for
 * `UsersModule`/`SessionsService` to resolve, the same way the real
 * `AppModule` relies on `DatabaseModule` being imported once, globally.
 */
@Global()
@Module({
  providers: [{ provide: DATABASE_CONNECTION, useValue: createFakeDb() }],
  exports: [DATABASE_CONNECTION],
})
class FakeDatabaseModule {}

/**
 * Integration-level test for the provider-selection wiring in
 * `auth.module.ts` — mirrors what a similar test for
 * `ACTIVE_MUSIC_PROVIDER`/`discovery.module.ts` would look like, had one
 * existed. Unlike `otp.service.spec.ts` (which tests `OtpService`
 * against a hand-built fake provider) and `email-otp-provider.spec.ts`
 * (which tests `EmailOtpProvider` in isolation), this test builds the
 * real Nest module graph to confirm the *factory* — the part of the
 * system that decides which concrete provider is active — behaves
 * correctly for both configuration states.
 */
describe('AuthModule ACTIVE_OTP_DELIVERY_PROVIDER selection', () => {
  const requiredEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/unused',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function buildAuthModule() {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        FakeDatabaseModule,
        AuthModule,
      ],
    }).compile();

    return moduleRef;
  }

  it('selects ConsoleOtpProvider when SMTP_HOST is not configured', async () => {
    process.env = { ...originalEnv, ...requiredEnv, SMTP_HOST: '' };
    delete process.env.SMTP_HOST;

    const moduleRef = await buildAuthModule();
    const activeProvider = moduleRef.get<OtpDeliveryProvider>(ACTIVE_OTP_DELIVERY_PROVIDER);

    expect(activeProvider).toBeInstanceOf(ConsoleOtpProvider);
  });

  it('selects EmailOtpProvider when SMTP_HOST is configured', async () => {
    process.env = { ...originalEnv, ...requiredEnv, SMTP_HOST: 'smtp.example.com' };

    const moduleRef = await buildAuthModule();
    const activeProvider = moduleRef.get<OtpDeliveryProvider>(ACTIVE_OTP_DELIVERY_PROVIDER);

    expect(activeProvider).toBeInstanceOf(EmailOtpProvider);
  });
});
