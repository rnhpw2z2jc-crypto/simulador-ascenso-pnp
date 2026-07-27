import { getUserByUsername, updateUser } from './users';

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const STORAGE_KEY = 'simulador_login_attempts';

interface AttemptRecord {
  username: string;
  timestamp: number;
}

function getAttempts(): AttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAttempts(attempts: AttemptRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
}

function getRecentAttempts(username: string): AttemptRecord[] {
  const cutoff = Date.now() - LOCKOUT_DURATION;
  return getAttempts().filter(a => a.username === username.toLowerCase() && a.timestamp > cutoff);
}

export async function recordFailedAttempt(username: string): Promise<{ locked: boolean; attemptsLeft: number }> {
  const attempts = getAttempts();
  attempts.push({ username: username.toLowerCase(), timestamp: Date.now() });
  saveAttempts(attempts);

  const recent = getRecentAttempts(username);
  const attemptsLeft = MAX_ATTEMPTS - recent.length;

  if (recent.length >= MAX_ATTEMPTS) {
    const user = await getUserByUsername(username);
    if (user && user.status !== 'blocked') {
      await updateUser({ ...user, status: 'blocked' });
    }
    return { locked: true, attemptsLeft: 0 };
  }

  return { locked: false, attemptsLeft };
}

export async function clearFailedAttempts(username: string): Promise<void> {
  const cutoff = Date.now() - LOCKOUT_DURATION;
  const remaining = getAttempts().filter(a => !(a.username === username.toLowerCase() && a.timestamp > cutoff));
  saveAttempts(remaining);
}

export async function isLockedOut(username: string): Promise<{ locked: boolean; attemptsLeft: number; unlockTime?: Date }> {
  try {
    const user = await getUserByUsername(username);
    
    if (user?.status === 'blocked') {
      const recent = getRecentAttempts(username);
      if (recent.length === 0) {
        await updateUser({ ...user, status: 'active' });
        return { locked: false, attemptsLeft: MAX_ATTEMPTS };
      }
      const oldestAttempt = recent[0];
      const unlockTime = new Date(oldestAttempt.timestamp + LOCKOUT_DURATION);
      
      if (new Date() > unlockTime) {
        await updateUser({ ...user, status: 'active' });
        await clearFailedAttempts(username);
        return { locked: false, attemptsLeft: MAX_ATTEMPTS };
      }
      
      return { locked: true, attemptsLeft: 0, unlockTime };
    }

    const recent = getRecentAttempts(username);
    const attemptsLeft = MAX_ATTEMPTS - recent.length;
    return { locked: false, attemptsLeft: Math.max(0, attemptsLeft) };
  } catch {
    return { locked: false, attemptsLeft: MAX_ATTEMPTS };
  }
}
