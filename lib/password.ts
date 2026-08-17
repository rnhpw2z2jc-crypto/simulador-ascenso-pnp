import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Primero intentar con bcrypt (nuevas contraseñas)
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash);
  }
  // Contraseña en texto plano (usuarios migrados) - verificar directamente
  return password === storedHash;
}

export function isBcryptHash(value: string): boolean {
  return value.startsWith('$2');
}
