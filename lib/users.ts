import { db } from './firebase';
import {
  collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, where
} from 'firebase/firestore';
import { hashPassword, verifyPassword, isBcryptHash } from './password';

export interface UserData {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  email: string;
  role: 'admin' | 'user';
  membershipExpiry: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'blocked';
  devices: string[];
  maxDevices: number;
}

const COLLECTION = 'users';

const DEFAULT_MAX_DEVICES = 1;

function normalizeUser(u: UserData): UserData {
  const legacy = u as unknown as { deviceId?: string | null; deviceLocked?: boolean };
  const devices = Array.isArray(u.devices) ? u.devices.slice(0, 2) : [];
  if (devices.length === 0 && legacy.deviceId && legacy.deviceLocked) {
    devices.push(legacy.deviceId);
  }
  const maxDevices = typeof u.maxDevices === 'number' ? Math.min(2, Math.max(1, Math.round(u.maxDevices))) : DEFAULT_MAX_DEVICES;
  return { ...u, devices, maxDevices };
}

export async function getAllUsers(): Promise<UserData[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => normalizeUser({ id: d.id, ...d.data() } as UserData));
}

export function toPublicUser(u: UserData): Omit<UserData, 'password'> {
  const { password, ...publicUser } = u;
  return publicUser;
}

export async function getAllUsersPublic(): Promise<Omit<UserData, 'password'>[]> {
  const users = await getAllUsers();
  return users.map(toPublicUser);
}

export async function getUserByUsername(username: string): Promise<UserData | null> {
  const q = query(collection(db, COLLECTION), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return normalizeUser({ id: doc.id, ...doc.data() } as UserData);
}

export async function createUser(user: UserData): Promise<void> {
  await setDoc(doc(db, COLLECTION, user.id), user);
}

export async function updateUser(user: Partial<UserData> & { id: string }): Promise<void> {
  const { id, ...data } = user;
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteUser(userId: string): Promise<void> {
  const examStatsSnap = await getDocs(query(collection(db, 'examStats'), where('userId', '==', userId)));
  for (const d of examStatsSnap.docs) {
    await deleteDoc(d.ref);
  }

  const accessLogsSnap = await getDocs(query(collection(db, 'accessLogs'), where('userId', '==', userId)));
  for (const d of accessLogsSnap.docs) {
    await deleteDoc(d.ref);
  }

  await deleteDoc(doc(db, COLLECTION, userId));
}

const ADMIN_DEFAULT_PASSWORD = 'AdminPNP2026!';

export async function seedDefaultAdmin(): Promise<void> {
  const existing = await getUserByUsername('admin');
  if (!existing) {
    const hashedPassword = await hashPassword(ADMIN_DEFAULT_PASSWORD);
    await createUser({
      id: 'admin-default',
      username: 'admin',
      password: hashedPassword,
      nombre: 'Administrador',
      apellido: 'General',
      email: '',
      role: 'admin',
      membershipExpiry: null,
      createdAt: new Date().toISOString(),
      status: 'active',
      devices: [],
      maxDevices: DEFAULT_MAX_DEVICES,
    });
  } else if (!isBcryptHash(existing.password)) {
    const hashedPassword = await hashPassword(existing.password);
    await updateUser({ ...existing, password: hashedPassword });
  }
}

export async function migrateDeviceFields(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    for (const docSnap of snap.docs) {
      const raw = docSnap.data();
      const hasDevices = typeof raw.devices !== 'undefined';
      const hasMaxDevices = typeof raw.maxDevices !== 'undefined';
      if (hasDevices && hasMaxDevices) continue;
      const legacy = raw as { deviceId?: string | null; deviceLocked?: boolean };
      const devices = Array.isArray(raw.devices) ? raw.devices.slice(0, 2)
        : (legacy.deviceId && legacy.deviceLocked ? [legacy.deviceId] : []);
      await updateDoc(docSnap.ref, {
        devices,
        maxDevices: typeof raw.maxDevices === 'number' ? raw.maxDevices : DEFAULT_MAX_DEVICES,
      });
    }
  } catch {
    // silent fail on migration
  }
}
