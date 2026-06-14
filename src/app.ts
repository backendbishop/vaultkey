import express, { type Express } from 'express';
import path from 'node:path';
import type { UserStore } from './types.js';
import { createAuthRouter } from './routes/auth.js';
import { createProfileRouter } from './routes/profile.js';

// process.cwd() is the repo root in both dev (npm run dev) and prod
// (npm start) since both scripts are invoked from the repo root.
// path.join(__dirname, ...) would be wrong here: src/app.ts and
// dist/src/app.js sit at different depths relative to the repo root.
const PUBLIC_DIR = path.join(process.cwd(), 'public');

export function createApp(userStore: UserStore): Express {
  const app = express();

  app.use(express.json({ limit: '10kb' }));

  app.use('/auth', createAuthRouter(userStore));
  app.use('/', createProfileRouter());
  app.use(express.static(PUBLIC_DIR));

  // 404 fallback — explicit JSON, not Express's HTML default.
  // Placed after express.static so real static files are served first.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
