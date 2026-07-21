import 'reflect-metadata';

// Runs before any e2e test file is loaded. This matters because
// `AppModule`'s `@Module()` decorator calls `ConfigModule.forRoot({
// validate: validateEnv })` at class-definition time — i.e. the moment the
// module is imported, not when a test's `beforeEach`/`beforeAll` runs.
// Setting these inside a test file's setup hook would be too late, since
// `import { AppModule } from '../src/app.module'` (hoisted to the top of
// the file) already triggers validation by then.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';

// ConfigModule.forRoot() (see app.module.ts) loads `apps/api/.env` via
// dotenv, which only *skips* a variable that's already present in
// process.env — it does not distinguish "present and empty" from
// "absent". A developer's local .env commonly has REDIS_URL (and
// possibly JAMENDO_CLIENT_ID/SMTP_HOST once configured) pointing at a
// real local service; leaving these unset here would let dotenv load
// those real values straight into e2e tests. Setting them to an empty
// string (not `delete`, which dotenv would then happily refill from
// .env) keeps them "present" from dotenv's point of view while still
// reading as falsy/optional to every consumer (DiscoveryModule,
// QueueModule, AuthModule) — guaranteeing e2e tests always exercise the
// fallback path (InlineMetadataRefreshQueue / MockProvider /
// ConsoleOtpProvider) regardless of what's in a developer's own .env.
process.env.REDIS_URL = '';
process.env.JAMENDO_CLIENT_ID = '';
process.env.SMTP_HOST = '';
