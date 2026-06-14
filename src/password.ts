import bcrypt from 'bcryptjs';

// bcryptjs (pure JS) chosen over bcrypt (native binding) deliberately:
// zero native build step on Termux/Android dev and Render free-tier builds.
// Cost: slower hashing under heavy load. Acceptable for v1 traffic profile.
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
