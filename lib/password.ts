import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('$2')) {
    throw new Error('Contraseña sin hashear. Requiere migración.');
  }
  return bcrypt.compare(password, storedHash);
}

export function isBcryptHash(value: string): boolean {
  return value.startsWith('$2');
}
