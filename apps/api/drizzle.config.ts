import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs standalone (outside Nest's DI/ConfigModule), so it reads
// DATABASE_URL directly from process.env rather than through
// src/config/env.validation.ts. Local dev loads this from apps/api/.env via
// drizzle-kit's built-in dotenv support.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set to run drizzle-kit (see .env.example).');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
