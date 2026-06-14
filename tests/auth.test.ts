import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { MemoryUserStore } from '../src/stores/memory.js';

function buildServer() {
  const store = new MemoryUserStore();
  const app = createApp(store);
  return http.createServer(app);
}

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

const VALID_USER = { email: 'simon@example.com', password: 'correct-horse' };

test('register with valid data returns 201 and stored user', async () => {
  const server = buildServer();
  const res = await request(server, 'POST', '/auth/register', VALID_USER);
  assert.equal(res.status, 201);
  assert.equal(res.body.email, VALID_USER.email);
  assert.ok(res.body.id);
});

test('register with duplicate email returns 409', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  const server1 = http.createServer(app);
  await request(server1, 'POST', '/auth/register', VALID_USER);

  const server2 = http.createServer(app);
  const res = await request(server2, 'POST', '/auth/register', VALID_USER);
  assert.equal(res.status, 409);
});

test('register with missing fields returns 400', async () => {
  const server = buildServer();
  const res = await request(server, 'POST', '/auth/register', { email: 'a@b.com' });
  assert.equal(res.status, 400);
});

test('register with invalid email format returns 400', async () => {
  const server = buildServer();
  const res = await request(server, 'POST', '/auth/register', {
    email: 'not-an-email',
    password: 'correct-horse',
  });
  assert.equal(res.status, 400);
});

test('register with short password returns 400', async () => {
  const server = buildServer();
  const res = await request(server, 'POST', '/auth/register', {
    email: 'short@example.com',
    password: 'short',
  });
  assert.equal(res.status, 400);
});

test('login with correct credentials returns 200 and JWT', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  await request(http.createServer(app), 'POST', '/auth/register', VALID_USER);

  const res = await request(http.createServer(app), 'POST', '/auth/login', VALID_USER);
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.token === 'string' && res.body.token.length > 0);
});

test('login with wrong password returns 401', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  await request(http.createServer(app), 'POST', '/auth/register', VALID_USER);

  const res = await request(http.createServer(app), 'POST', '/auth/login', {
    email: VALID_USER.email,
    password: 'wrong-password',
  });
  assert.equal(res.status, 401);
});

test('login with unknown email returns 401', async () => {
  const server = buildServer();
  const res = await request(server, 'POST', '/auth/login', {
    email: 'nobody@example.com',
    password: 'whatever123',
  });
  assert.equal(res.status, 401);
});
