import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { DATABASE_CONNECTION } from './database.constants';
import * as schema from './schema';
import { EnvironmentVariables } from '../config/env.validation';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Provides a single shared Drizzle/postgres-js connection pool for the
 * whole application. Global so every feature module can inject
 * `DATABASE_CONNECTION` without each one re-importing `DatabaseModule`.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const sql = postgres(config.get('DATABASE_URL', { infer: true }));
        return drizzle(sql, { schema });
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
