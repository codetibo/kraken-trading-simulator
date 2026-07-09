import bcrypt from "bcryptjs";
import { scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Custom password verification that handles both:
 * - Bcrypt hashes ($2a$/$2b$) from seeded users and legacy imports
 * - Scrypt hashes (native Better Auth format: "salt:derivedKey") from new sign-ups
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash || !password) return false;

  // Bcrypt hashes start with $2a$ or $2b$
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  // Scrypt hashes (Better Auth native format: "salt:derivedKey")
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64);
    const expectedKey = Buffer.from(key, 'base64');
    if (derivedKey.length !== expectedKey.length) return false;
    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}
