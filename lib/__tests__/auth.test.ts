import { describe, it, expect } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { scryptSync } from 'node:crypto';
import { verifyPassword } from '@/lib/auth-verify';

// ─── Scrypt hash generation (mirrors Better Auth's internal format) ────────

function createScryptHash(password: string): string {
  const salt = 'abcdef0123456789abcdef0123456789'; // fixed salt for deterministic testing
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('base64')}`;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Password Verification (bcrypt path)', () => {
  it('verifies a correct bcrypt-hashed password', async () => {
    const hash = await bcrypt.hash('demo123456', 12);
    const result = await verifyPassword(hash, 'demo123456');
    expect(result).toBe(true);
  });

  it('rejects an incorrect bcrypt-hashed password', async () => {
    const hash = await bcrypt.hash('demo123456', 12);
    const result = await verifyPassword(hash, 'wrongpassword');
    expect(result).toBe(false);
  });

  it('handles $2a$ prefix', async () => {
    const original = await bcrypt.hash('mypassword', 10);
    const hashWith2a = original.replace('$2b$', '$2a$');
    const result = await verifyPassword(hashWith2a, 'mypassword');
    expect(result).toBe(true);
  });

  it('handles $2b$ prefix', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    expect(hash.startsWith('$2b$')).toBe(true);
    const result = await verifyPassword(hash, 'mypassword');
    expect(result).toBe(true);
  });

  it('rejects empty password', async () => {
    const hash = await bcrypt.hash('demo123456', 12);
    const result = await verifyPassword(hash, '');
    expect(result).toBe(false);
  });

  it('rejects when hash is empty', async () => {
    const result = await verifyPassword('', 'demo123456');
    expect(result).toBe(false);
  });
});

describe('Password Verification (scrypt path)', () => {
  it('verifies a correct scrypt-hashed password', async () => {
    const hash = createScryptHash('securePass123');
    const result = await verifyPassword(hash, 'securePass123');
    expect(result).toBe(true);
  });

  it('rejects an incorrect scrypt-hashed password', async () => {
    const hash = createScryptHash('securePass123');
    const result = await verifyPassword(hash, 'wrongpassword');
    expect(result).toBe(false);
  });

  it('rejects malformed scrypt hash (no colon separator)', async () => {
    const result = await verifyPassword('invalidhashwithoutseparator', 'password');
    expect(result).toBe(false);
  });

  it('rejects malformed scrypt hash (empty salt part)', async () => {
    const result = await verifyPassword(':base64keypart', 'password');
    expect(result).toBe(false);
  });

  it('rejects malformed scrypt hash (empty key part)', async () => {
    const result = await verifyPassword('salthex:', 'password');
    expect(result).toBe(false);
  });
});

describe('Password Verification (edge cases)', () => {
  it('returns false when both hash and password are empty', async () => {
    const result = await verifyPassword('', '');
    expect(result).toBe(false);
  });

  it('returns false when hash is null-like', async () => {
    const result = await verifyPassword('', 'somepassword');
    expect(result).toBe(false);
  });

  it('handles very long passwords', async () => {
    const longPw = 'a'.repeat(128);
    const hash = await bcrypt.hash(longPw, 10);
    const result = await verifyPassword(hash, longPw);
    expect(result).toBe(true);
  });

  it('handles scrypt hash with special characters in password', async () => {
    const specialPw = 'p@$$w0rd!<>#&';
    const hash = createScryptHash(specialPw);
    const result = await verifyPassword(hash, specialPw);
    expect(result).toBe(true);
  });
});
