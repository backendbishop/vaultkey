export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
};

export type PublicUser = {
  id: string;
  email: string;
  createdAt: number;
};

export type TokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

export interface UserStore {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export type ApiError = {
  error: string;
};

// Augment Express Request with the authenticated user.
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
