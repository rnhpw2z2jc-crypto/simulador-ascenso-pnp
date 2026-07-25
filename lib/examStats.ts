import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';

export interface ExamStatEntry {
  id: string;
  userId: string;
  username: string;
  totalQuestions: number;
  correctAnswers: number;
  failedQuestionIds: number[];
  date: string;
}

const COLLECTION = 'examStats';

export async function saveExamStat(data: Omit<ExamStatEntry, 'id' | 'date'>): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    date: new Date().toISOString(),
  });
}

export async function getExamStats(limitCount: number = 500): Promise<ExamStatEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy('date', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamStatEntry));
}
