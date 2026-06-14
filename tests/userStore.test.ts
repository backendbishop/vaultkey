import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryUserStore } from '../src/stores/memory.js';
import { SqliteUserStore } from '../src/stores/sqlite.js';
import type { User, UserStore } from '../src/types.js';

// Contract suite: any UserStore implementation must satisfy these
// behaviors identically. Runs the same assertions against both stores
// rather than duplicating route-level tests per backend — route tests
// (auth, middleware, rate limiting) already cover request handling and
// don't need to be repeated per storage implementation.

type StoreFactory = {
  name: string;
  create: () => UserStore & { close?: () => void };
};

const stores: StoreFactory[] = [
  { name: 'MemoryUserStore', create: () => new MemoryUserStore() },
  { name: 'SqliteUserStore', create: () => new SqliteUserStore(':memory:') },
];

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    email: 'contract@example.com',
    passwordHash: 'hashed-value',
    createdAt: Date.now(),
    ...overrides,
  };
}

for (const { name, create } of stores) {
  test(`${name}: findByEmail returns null for unknown email`, async () => {
    const store = create();
    const result = await store.findByEmail('nobody@example.com');
    assert.equal(result, null);
    store.close?.();
  });

  test(`${name}: save then findByEmail returns the saved user`, async () => {
    const store = create();
    const user = makeUser({ email: 'found@example.com' });
    await store.save(user);

    const result = await store.findByEmail('found@example.com');
    assert.ok(result);
    assert.equal(result.id, user.id);
    assert.equal(result.email, user.email);
    assert.equal(result.passwordHash, user.passwordHash);
    assert.equal(result.createdAt, user.createdAt);
    store.close?.();
  });

  test(`${name}: findByEmail is case-insensitive`, async () => {
    const store = create();
    const user = makeUser({ email: 'mixedcase@example.com' });
    await store.save(user);

    const result = await store.findByEmail('MixedCase@Example.com');
    assert.ok(result);
    assert.equal(result.email, 'mixedcase@example.com');
    store.close?.();
  });

  test(`${name}: save throws on duplicate email`, async () => {
    const store = create();
    const user1 = makeUser({ email: 'dup@example.com' });
    const user2 = makeUser({ email: 'dup@example.com' });

    await store.save(user1);
    await assert.rejects(() => store.save(user2));
    store.close?.();
  });

  test(`${name}: save throws on duplicate email regardless of case`, async () => {
    const store = create();
    const user1 = makeUser({ email: 'caseinsensitive@example.com' });
    const user2 = makeUser({ email: 'CaseInsensitive@Example.com' });

    await store.save(user1);
    await assert.rejects(() => store.save(user2));
    store.close?.();
  });

  test(`${name}: multiple distinct users can be saved and retrieved independently`, async () => {
    const store = create();
    const userA = makeUser({ email: 'a@example.com' });
    const userB = makeUser({ email: 'b@example.com' });

    await store.save(userA);
    await store.save(userB);

    const resultA = await store.findByEmail('a@example.com');
    const resultB = await store.findByEmail('b@example.com');

    assert.equal(resultA?.id, userA.id);
    assert.equal(resultB?.id, userB.id);
    store.close?.();
  });
}
