import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Typed, validated environment configuration.
 *
 * Per docs/architecture/security.md ("Secrets... come from environment
 * variables... never hardcoded") and general production-readiness: the app
 * must fail fast at startup with a clear error if required configuration
 * is missing or malformed, rather than surfacing a confusing runtime error
 * the first time a misconfigured value is used (e.g. a JWT secret that's
 * `undefined` silently signing tokens with the string "undefined").
 */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters (256 bits) long',
  })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters (256 bits) long',
  })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  /**
   * Per docs/architecture/music-provider-architecture.md, Jamendo is the
   * first real `MusicProvider`. Deliberately optional: when unset (e.g.
   * local dev without an API key, or the test environment),
   * `DiscoveryModule` falls back to `MockProvider` rather than failing
   * startup — a missing third-party API key should degrade gracefully,
   * not be treated the same as a missing JWT secret.
   */
  @IsString()
  @IsOptional()
  JAMENDO_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  JAMENDO_API_BASE_URL: string = 'https://api.jamendo.com/v3.0';

  /**
   * Backs the metadata-refresh job queue (see
   * apps/api/src/discovery/discovery.module.ts). Deliberately optional,
   * same reasoning as `JAMENDO_CLIENT_ID`: when unset (local dev without
   * Docker running, and every test — `jest-e2e-setup.ts` never sets
   * this), the app falls back to an in-process inline queue instead of
   * failing startup or requiring a real Redis connection.
   */
  @IsString()
  @IsOptional()
  REDIS_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${messages}`);
  }

  return validated;
}
