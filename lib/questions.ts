import type { Question } from '../components/types';

const JSON_URL = '/questions.json';
const CACHE_KEY = 'simulador_questions_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

let memoryCache: Question[] | null = null;

interface CacheData {
  timestamp: number;
  questions: Question[];
}

function readCache(): Question[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data.questions;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeCache(questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data: CacheData = { timestamp: Date.now(), questions };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export async function getAllQuestions(): Promise<Question[]> {
  if (memoryCache) return memoryCache;

  const cached = readCache();
  if (cached && cached.length > 0) {
    memoryCache = cached;
    return cached;
  }

  const res = await fetch(JSON_URL);
  const questions: Question[] = await res.json();

  if (questions.length > 0) {
    writeCache(questions);
    memoryCache = questions;
  }

  return questions;
}

export function clearQuestionsCache(): void {
  memoryCache = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}
