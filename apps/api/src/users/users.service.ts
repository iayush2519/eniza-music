import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { NewUser, User, users } from '../database/schema';

/**
 * Owns all direct reads/writes to the `users` table. Per
 * docs/architecture/backend-architecture.md, this talks to Drizzle
 * directly rather than through a repository abstraction — there is no
 * second storage implementation planned, so a repository layer here would
 * be speculative complexity.
 */
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async create(newUser: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(newUser).returning();
    return user;
  }
}
