import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import type { UserStore, ApiError } from '../types.js';
import { hashPassword, verifyPassword } from '../password.js';
import { signToken } from '../token.js';
import { createLoginRateLimiter, createRegisterRateLimiter } from '../middleware/rateLimiter.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

type RegisterBody = {
  email?: unknown;
  password?: unknown;
};

type RegisterResponse = { id: string; email: string } | ApiError;
type LoginResponse = { token: string } | ApiError;

function validateCredentialShape(
  body: RegisterBody,
): { email: string; password: string } | { error: string } {
  const { email, password } = body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Email and password are required and must be strings' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length === 0 || normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return { error: 'Invalid email' };
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { error: 'Invalid email' };
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters` };
  }

  return { email: normalizedEmail, password };
}

export function createAuthRouter(userStore: UserStore): Router {
  const router = Router();
  const loginRateLimiter = createLoginRateLimiter();
  const registerRateLimiter = createRegisterRateLimiter();

  router.post('/register', registerRateLimiter, async (req: Request, res: Response<RegisterResponse>) => {
    const validated = validateCredentialShape(req.body as RegisterBody);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const { email, password } = validated;

    const existing = await userStore.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      createdAt: Date.now(),
    };

    try {
      await userStore.save(user);
    } catch {
      // Race: another request registered the same email between the
      // findByEmail check and save(). Surface as 409, not 500.
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    res.status(201).json({ id: user.id, email: user.email });
  });

  router.post('/login', loginRateLimiter, async (req: Request, res: Response<LoginResponse>) => {
    const validated = validateCredentialShape(req.body as RegisterBody);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const { email, password } = validated;

    const user = await userStore.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ id: user.id, email: user.email });
    res.status(200).json({ token });
  });

  return router;
}
