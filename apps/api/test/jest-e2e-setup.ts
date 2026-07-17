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
