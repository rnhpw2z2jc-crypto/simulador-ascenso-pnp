import { db } from './firebase';
import {
  collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, where
} from 'firebase/firestore';

export interface UserData {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  grado: string;
  cip: string;
  dni: string;
  email: string;
  role: 'admin' | 'user';
  membershipExpiry: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'blocked';
}

const COLLECTION = 'users';

export async function getAllUsers(): Promise<UserData[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
}

export async function getUserByUsername(username: string): Promise<UserData | null> {
  const q = query(collection(db, COLLECTION), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as UserData;
}

export async function createUser(user: UserData): Promise<void> {
  await setDoc(doc(db, COLLECTION, user.id), user);
}

export async function updateUser(user: UserData): Promise<void> {
  const { id, ...data } = user;
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, userId));
}

export async function seedDefaultAdmin(): Promise<void> {
  const existing = await getUserByUsername('admin');
  if (!existing) {
    await createUser({
      id: 'admin-default',
      username: 'admin',
      password: '123456',
      nombre: 'Administrador',
      apellido: 'General',
      grado: 'GP',
      cip: '00000000',
      dni: '00000000',
      email: '',
      role: 'admin',
      membershipExpiry: null,
      createdAt: new Date().toISOString(),
      status: 'active',
    });
  }
}
