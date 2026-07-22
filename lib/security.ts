const MAX_LENGTHS = {
  username: 30,
  password: 100,
  nombre: 60,
  apellido: 60,
  email: 100,
} as const;

function stripHtml(input: string): string {
  return input.replace(/[<>]/g, '');
}

function trimAndSanitize(input: string): string {
  return stripHtml(input.trim());
}

export function sanitizeUserInput<T extends Record<string, string>>(fields: T): T {
  const sanitized = {} as Record<string, string>;
  for (const [key, value] of Object.entries(fields)) {
    const maxLen = (MAX_LENGTHS as Record<string, number>)[key] ?? 100;
    sanitized[key] = trimAndSanitize(value).slice(0, maxLen);
  }
  return sanitized as T;
}

export function validateUsername(username: string): string | null {
  const clean = trimAndSanitize(username);
  if (clean.length < 3) return 'El usuario debe tener al menos 3 caracteres';
  if (!/^[a-zA-Z0-9._-]+$/.test(clean)) return 'El usuario solo puede contener letras, numeros, puntos, guiones';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'La contrasena debe tener al least 6 caracteres';
  if (password.length > 100) return 'Contrasena demasiado larga';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null;
  const clean = trimAndSanitize(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return 'Formato de correo invalido';
  return null;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxAttempts;
}

const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  Array.from(loginAttempts.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) loginAttempts.delete(key);
  });
}, RATE_LIMIT_CLEANUP_INTERVAL);
