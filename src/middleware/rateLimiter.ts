import { rateLimit } from 'express-rate-limit';
import type { RequestHandler, Request, Response } from 'express';
import type { ApiError } from '../types.js';

// In-memory store (express-rate-limit default) — correct for a single
// Render instance. If Vaultkey ever runs multiple instances, swap to
// rate-limit-redis: same middleware shape, one store argument changes.
//
// Fail-open by design (express-rate-limit default): if the store itself
// errors, requests are allowed through rather than blocked. Accepted
// tradeoff for v1 — availability over strictness on limiter failure.

const jsonHandler = (_req: Request, res: Response<ApiError>) => {
  res.status(429).json({ error: 'Too many requests. Try again later.' });
};

// Factories, not singletons: each call returns a limiter with its own
// MemoryStore. Production wires one instance per route at app startup;
// tests construct fresh instances per test so counters don't leak across
// test cases (which all originate from 127.0.0.1).

// 5 attempts / 15 min per IP — generous for legitimate retries
// (typo'd password), tight enough to slow credential stuffing against
// bcrypt-hashed passwords.
export function createLoginRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler,
  });
}

// 3 attempts / hour per IP — registration is rare for a legitimate user;
// tighter limit curbs automated account creation.
export function createRegisterRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler,
  });
}
