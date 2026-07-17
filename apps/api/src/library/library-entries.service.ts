import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { LibraryEntry, libraryEntries } from '../database/schema';

type LibraryEntityType = LibraryEntry['entityType'];

@Injectable()
export class LibraryEntriesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAllForUser(userId: string, entityType?: LibraryEntityType): Promise<LibraryEntry[]> {
    const conditions = entityType
      ? and(eq(libraryEntries.userId, userId), eq(libraryEntries.entityType, entityType))
      : eq(libraryEntries.userId, userId);

    return this.db
      .select()
      .from(libraryEntries)
      .where(conditions)
      .orderBy(libraryEntries.createdAt);
  }

  async isSaved(userId: string, entityType: LibraryEntityType, entityId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: libraryEntries.id })
      .from(libraryEntries)
      .where(
        and(
          eq(libraryEntries.userId, userId),
          eq(libraryEntries.entityType, entityType),
          eq(libraryEntries.entityId, entityId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  /** Idempotent: saving an already-saved entity is a no-op, not an error. */
  async save(userId: string, entityType: LibraryEntityType, entityId: string): Promise<void> {
    const alreadySaved = await this.isSaved(userId, entityType, entityId);
    if (alreadySaved) {
      return;
    }

    await this.db.insert(libraryEntries).values({ userId, entityType, entityId });
  }

  async remove(userId: string, entityType: LibraryEntityType, entityId: string): Promise<void> {
    await this.db
      .delete(libraryEntries)
      .where(
        and(
          eq(libraryEntries.userId, userId),
          eq(libraryEntries.entityType, entityType),
          eq(libraryEntries.entityId, entityId),
        ),
      );
  }
}
