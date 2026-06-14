import jwt from 'jsonwebtoken';
import type { TokenPayload } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast at module load — identical behavior under `tsx` (dev) and
// compiled `node dist/src/server.js` (prod), since this is plain runtime
// code, not a build-time check. A missing secret must never reach a
// running HTTP server.
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // eslint-disable-next-line no-console
  console.error(
    'FATAL: JWT_SECRET is missing or too short (min 32 chars). ' +
      'Set it in your environment (.env locally, dashboard on Render) and restart.',
  );
  process.exit(1);
}

const SECRET: string = JWT_SECRET;
const ALGORITHM = 'HS256' as const;
const EXPIRES_IN = '1h';

export type SignableUser = {
  id: string;
  email: string;
};

export function signToken(user: SignableUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, {
    algorithm: ALGORITHM,
    expiresIn: EXPIRES_IN,
  });
}

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: [ALGORITHM] });
    if (typeof decoded === 'string') {
      throw new TokenError('Invalid token payload');
    }
    const { sub, email, iat, exp } = decoded;
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new TokenError('Invalid token payload');
    }
    return { sub, email, iat: iat as number, exp: exp as number };
  } catch (err) {
    if (err instanceof TokenError) throw err;
    throw new TokenError('Invalid or expired token');
  }
}
