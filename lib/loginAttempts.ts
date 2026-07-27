import { db } from './firebase';
import { 
  collection, addDoc, getDocs, query, where, 
  orderBy, limit as firestoreLimit, deleteDoc, doc 
} from 'firebase/firestore';
import { getUserByUsername, updateUser } from './users';

const COLLECTION = 'loginAttempts';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

interface FailedAttempt {
  id: string;
  username: string;
  timestamp: string;
}

export async function recordFailedAttempt(username: string): Promise<{ locked: boolean; attemptsLeft: number }> {
  await addDoc(collection(db, COLLECTION), {
    username: username.toLowerCase(),
    timestamp: new Date().toISOString(),
  });

  const attempts = await getFailedAttempts(username);
  const attemptsLeft = MAX_ATTEMPTS - attempts.length;

  if (attempts.length >= MAX_ATTEMPTS) {
    const user = await getUserByUsername(username);
    if (user && user.status !== 'blocked') {
      await updateUser({ ...user, status: 'blocked' });
    }
    return { locked: true, attemptsLeft: 0 };
  }

  return { locked: false, attemptsLeft };
}

export async function getFailedAttempts(username: string): Promise<FailedAttempt[]> {
  const cutoff = new Date(Date.now() - LOCKOUT_DURATION).toISOString();
  const q = query(
    collection(db, COLLECTION),
    where('username', '==', username.toLowerCase()),
    orderBy('timestamp', 'desc'),
    firestoreLimit(10)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as FailedAttempt))
    .filter(a => a.timestamp > cutoff);
}

export async function clearFailedAttempts(username: string): Promise<void> {
  const attempts = await getFailedAttempts(username);
  for (const attempt of attempts) {
    await deleteDoc(doc(db, COLLECTION, attempt.id));
  }
}

export async function isLockedOut(username: string): Promise<{ locked: boolean; attemptsLeft: number; unlockTime?: Date }> {
  const user = await getUserByUsername(username);
  
  if (user?.status === 'blocked') {
    const attempts = await getFailedAttempts(username);
    if (attempts.length === 0) {
      await updateUser({ ...user, status: 'active' });
      return { locked: false, attemptsLeft: MAX_ATTEMPTS };
    }
    const oldestAttempt = attempts[attempts.length - 1];
    const unlockTime = new Date(new Date(oldestAttempt.timestamp).getTime() + LOCKOUT_DURATION);
    
    if (new Date() > unlockTime) {
      await updateUser({ ...user, status: 'active' });
      await clearFailedAttempts(username);
      return { locked: false, attemptsLeft: MAX_ATTEMPTS };
    }
    
    return { locked: true, attemptsLeft: 0, unlockTime };
  }

  const attempts = await getFailedAttempts(username);
  const attemptsLeft = MAX_ATTEMPTS - attempts.length;
  return { locked: false, attemptsLeft: Math.max(0, attemptsLeft) };
}
