import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import type { ApiError, TokenPayload } from '../types.js';

type ProfileResponse = { id: string; email: string } | ApiError;

export function createProfileRouter(): Router {
  const router = Router();

  router.get('/profile', authenticate, (req: Request, res: Response<ProfileResponse>) => {
    const user = req.user as TokenPayload;
    res.status(200).json({ id: user.sub, email: user.email });
  });

  return router;
}
