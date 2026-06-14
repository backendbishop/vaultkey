import type { User, UserStore } from '../types.js';

// In-memory store. Single-process only — not safe across multiple Render
// instances or restarts. v2 replaces this with SQLite behind the same
// UserStore interface; no call-site changes required.
export class MemoryUserStore implements UserStore {
  private usersByEmail = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async save(user: User): Promise<void> {
    const key = user.email.toLowerCase();
    if (this.usersByEmail.has(key)) {
      throw new Error(`User with email ${user.email} already exists`);
    }
    this.usersByEmail.set(key, user);
  }
}
