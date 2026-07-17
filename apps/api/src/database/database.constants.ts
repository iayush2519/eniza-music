/**
 * DI token for the Drizzle database instance. Using an explicit token
 * (rather than injecting a concrete class) keeps every consumer decoupled
 * from the specific `postgres-js` driver — swapping the underlying driver
 * later is a change to `database.module.ts` alone.
 */
export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');
