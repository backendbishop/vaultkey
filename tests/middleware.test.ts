import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
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

const VALID_USER = { email: 'profile@example.com', password: 'correct-horse' };

test('access protected route with valid token returns 200', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  await request(http.createServer(app), 'POST', '/auth/register', VALID_USER);
  const loginRes = await request(http.createServer(app), 'POST', '/auth/login', VALID_USER);
  const token = loginRes.body.token as string;

  const res = await request(http.createServer(app), 'GET', '/profile', undefined, {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.email, VALID_USER.email);
});

test('access protected route with no token returns 401', async () => {
  const server = buildServer();
  const res = await request(server, 'GET', '/profile');
  assert.equal(res.status, 401);
});

test('access protected route with malformed token returns 401', async () => {
  const server = buildServer();
  const res = await request(server, 'GET', '/profile', undefined, {
    Authorization: 'Bearer not-a-real-token',
  });
  assert.equal(res.status, 401);
});

test('access protected route with expired token returns 401', async () => {
  const server = buildServer();
  const expired = jwt.sign(
    { sub: 'some-id', email: 'expired@example.com' },
    process.env.JWT_SECRET as string,
    { algorithm: 'HS256', expiresIn: '-1s' },
  );
  const res = await request(server, 'GET', '/profile', undefined, {
    Authorization: `Bearer ${expired}`,
  });
  assert.equal(res.status, 401);
});

test('access protected route with token missing Bearer prefix returns 401', async () => {
  const store = new MemoryUserStore();
  const app = createApp(store);
  await request(http.createServer(app), 'POST', '/auth/register', VALID_USER);
  const loginRes = await request(http.createServer(app), 'POST', '/auth/login', VALID_USER);
  const token = loginRes.body.token as string;

  const res = await request(http.createServer(app), 'GET', '/profile', undefined, {
    Authorization: token,
  });
  assert.equal(res.status, 401);
});
