import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { MemoryUserStore } from '../src/stores/memory.js';

async function request(
  server: http.Server,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const payload = body !== undefined ? JSON.stringify(body) : undefined;

      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...headers,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            server.close();
            resolve({
              status: res.statusCode ?? 0,
              body: raw ? JSON.parse(raw) : undefined,
            });
          });
        },
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  });
}

const VALID_USER = { email: 'ratelimit@example.com', password: 'correct-horse' };

test('login is rate limited after 5 attempts per IP', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  await request(http.createServer(app), 'POST', '/auth/register', VALID_USER);

  const wrongCreds = { email: VALID_USER.email, password: 'wrong-password' };

  for (let i = 0; i < 5; i++) {
    const res = await request(http.createServer(app), 'POST', '/auth/login', wrongCreds);
    assert.equal(res.status, 401, `attempt ${i + 1} should be 401, got ${res.status}`);
  }

  const limited = await request(http.createServer(app), 'POST', '/auth/login', wrongCreds);
  assert.equal(limited.status, 429);
  assert.match(limited.body.error, /too many requests/i);
});

test('login rate limit returns 429 with correct shape', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  const creds = { email: 'doesnotexist@example.com', password: 'whatever123' };

  for (let i = 0; i < 5; i++) {
    await request(http.createServer(app), 'POST', '/auth/login', creds);
  }
  const res = await request(http.createServer(app), 'POST', '/auth/login', creds);
  assert.equal(res.status, 429);
  assert.deepEqual(Object.keys(res.body), ['error']);
});

test('register is rate limited after 3 attempts per IP', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);

  for (let i = 0; i < 3; i++) {
    const res = await request(http.createServer(app), 'POST', '/auth/register', {
      email: `user${i}@example.com`,
      password: 'correct-horse',
    });
    assert.equal(res.status, 201, `attempt ${i + 1} should be 201, got ${res.status}`);
  }

  const limited = await request(http.createServer(app), 'POST', '/auth/register', {
    email: 'user3@example.com',
    password: 'correct-horse',
  });
  assert.equal(limited.status, 429);
  assert.match(limited.body.error, /too many requests/i);
});

test('rate limit counters are isolated per app instance', async () => {
  const storeA = new MemoryUserStore();
  const appA = createApp(storeA);
  const storeB = new MemoryUserStore();
  const appB = createApp(storeB);

  const creds = { email: 'isolated@example.com', password: 'whatever123' };

  for (let i = 0; i < 5; i++) {
    await request(http.createServer(appA), 'POST', '/auth/login', creds);
  }
  const limitedA = await request(http.createServer(appA), 'POST', '/auth/login', creds);
  assert.equal(limitedA.status, 429);

  const okB = await request(http.createServer(appB), 'POST', '/auth/login', creds);
  assert.equal(okB.status, 401);
});

test('/profile is not affected by auth rate limiters', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);

  const creds = { email: 'profile-check@example.com', password: 'whatever123' };
  for (let i = 0; i < 6; i++) {
    await request(http.createServer(app), 'POST', '/auth/login', creds);
  }

  const res = await request(http.createServer(app), 'GET', '/profile');
  assert.equal(res.status, 401);
});
