'use client';

import { useState, useEffect } from 'react';
import { getAllQuestions } from '../lib/questions';
import type { Question } from './types';

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const all = await getAllQuestions();
        if (!cancelled) setQuestions(all);
      } catch (err) {
        console.error('Error loading questions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { questions, loading };
}
