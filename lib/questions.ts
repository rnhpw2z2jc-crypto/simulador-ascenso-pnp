import { db } from './firebase';
import { 
  collection, getDocs, doc, setDoc, query, where, 
  writeBatch, getDoc 
} from 'firebase/firestore';
import type { Question } from '../components/types';

const COLLECTION = 'questions';
const CACHE_KEY = 'simulador_questions_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let memoryCache: Question[] | null = null;

interface CacheData {
  timestamp: number;
  questions: Question[];
}

function getCacheKeyByCategory(category: string): string {
  return `${CACHE_KEY}_${category}`;
}

function readCache(key: string): Question[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data.questions;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCache(key: string, questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data: CacheData = { timestamp: Date.now(), questions };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export async function getAllQuestions(): Promise<Question[]> {
  if (memoryCache) return memoryCache;

  const cached = readCache(CACHE_KEY);
  if (cached && cached.length > 0) {
    memoryCache = cached;
    return cached;
  }

  const snap = await getDocs(collection(db, COLLECTION));
  const questions = snap.docs.map(d => d.data() as Question);
  
  if (questions.length > 0) {
    writeCache(CACHE_KEY, questions);
    memoryCache = questions;
  }

  return questions;
}

export async function getQuestionsByCategory(category: string): Promise<Question[]> {
  const cacheKey = getCacheKeyByCategory(category);
  const cached = readCache(cacheKey);
  if (cached && cached.length > 0) return cached;

  const q = query(collection(db, COLLECTION), where('category', '==', category));
  const snap = await getDocs(q);
  const questions = snap.docs.map(d => d.data() as Question);

  if (questions.length > 0) {
    writeCache(cacheKey, questions);
  }

  return questions;
}

export async function getQuestionCount(): Promise<number> {
  const all = await getAllQuestions();
  return all.length;
}

export async function isSeeded(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.size > 0;
  } catch {
    return false;
  }
}

export async function seedQuestions(
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const { questions: sourceQuestions } = await import('../data/questions');
  const total = sourceQuestions.length;
  let seeded = 0;

  const BATCH_SIZE = 500;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = sourceQuestions.slice(i, i + BATCH_SIZE);
    
    chunk.forEach(q => {
      const docRef = doc(db, COLLECTION, String(q.id));
      batch.set(docRef, {
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category,
        explanation: q.explanation,
        legalBasis: q.legalBasis || null,
      });
    });

    await batch.commit();
    seeded += chunk.length;
    onProgress?.(seeded, total);
  }

  memoryCache = null;
  localStorage.removeItem(CACHE_KEY);

  return seeded;
}

export function clearQuestionsCache(): void {
  memoryCache = null;
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY));
  keys.forEach(k => localStorage.removeItem(k));
}
