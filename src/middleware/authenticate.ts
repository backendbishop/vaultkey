import type { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenError } from '../token.js';
import type { ApiError } from '../types.js';

const BEARER_PREFIX = 'Bearer ';

export function authenticate(req: Request, res: Response<ApiError>, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    if (err instanceof TokenError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
