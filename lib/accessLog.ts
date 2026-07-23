import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';

export interface AccessLogEntry {
  id: string;
  userId: string;
  username: string;
  deviceId: string;
  platform: string;
  browser: string;
  status: 'allowed' | 'blocked';
  reason: string;
  timestamp: string;
}

const COLLECTION = 'accessLogs';

export async function logAccessAttempt(data: Omit<AccessLogEntry, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export async function getAccessLogs(limitCount: number = 100): Promise<AccessLogEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessLogEntry));
}
