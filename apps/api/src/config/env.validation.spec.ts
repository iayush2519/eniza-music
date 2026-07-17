import { validateEnv } from './env.validation';

const validConfig = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a fully valid configuration', () => {
    expect(() => validateEnv(validConfig)).not.toThrow();
  });

  it('applies defaults for optional fields', () => {
    const result = validateEnv(validConfig);
    expect(result.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(result.JWT_REFRESH_EXPIRES_IN).toBe('30d');
  });

  it('rejects a missing DATABASE_URL', () => {
    const rest = { ...validConfig };
    delete (rest as Partial<typeof validConfig>).DATABASE_URL;
    expect(() => validateEnv(rest)).toThrow(/Invalid environment configuration/);
  });

  it('rejects a JWT_ACCESS_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...validConfig, JWT_ACCESS_SECRET: 'too-short' })).toThrow();
  });

  it('rejects a JWT_REFRESH_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...validConfig, JWT_REFRESH_SECRET: 'too-short' })).toThrow();
  });

  it('rejects an invalid NODE_ENV value', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow();
  });

  it('rejects a PORT outside the valid range', () => {
    expect(() => validateEnv({ ...validConfig, PORT: '99999' })).toThrow();
  });
});
