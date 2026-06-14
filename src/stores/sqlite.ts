import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type { User, UserStore } from '../types.js';

// node:sqlite (stable, unflagged in Node 22.5+) — synchronous API, zero
// native bindings. Avoids the better-sqlite3 native-compile step on
// Termux/Render, consistent with the bcryptjs-over-bcrypt precedent.
//
// IMPORTANT — Render free tier has an ephemeral filesystem. Data in
// DB_PATH survives across requests and restarts *within* a deploy, but a
// new deploy (redeploy, image rebuild) wipes it. This is "persistence
// during a session," not "durable storage across deploys." True
// durability requires a Render persistent disk (paid) or external DB.
//
// Synchronous queries block the event loop for their duration. At this
// scale (single table, indexed lookups) that's sub-millisecond and
// negligible. At higher throughput, a worker-thread or async DB driver
// would be the next step.

export class SqliteUserStore implements UserStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    // WAL has no effect on :memory: databases (SQLite requires a backing
    // file for WAL) — harmless no-op in that case, real benefit on disk.
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(
      'SELECT id, email, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE email = ?',
    );
    const row = stmt.get(email.toLowerCase()) as
      | { id: string; email: string; passwordHash: string; createdAt: number }
      | undefined;
    return row ?? null;
  }

  async save(user: User): Promise<void> {
    const stmt = this.db.prepare(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    );
    try {
      stmt.run(user.id, user.email.toLowerCase(), user.passwordHash, user.createdAt);
    } catch {
      // UNIQUE constraint violation on email — surface the same error
      // shape as MemoryUserStore so routes/auth.ts's catch block (which
      // maps any save() throw to 409) behaves identically across stores.
      throw new Error(`User with email ${user.email} already exists`);
    }
  }

  // Closes the underlying database connection. Not part of UserStore —
  // used by tests and graceful shutdown to release the file handle.
  close(): void {
    this.db.close();
  }
}
