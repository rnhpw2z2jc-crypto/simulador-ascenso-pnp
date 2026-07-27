'use client';

import { useState, useEffect } from 'react';
import { getAllQuestions, seedQuestions, isSeeded } from '../lib/questions';
import type { Question } from './types';

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const seeded = await isSeeded();
        if (cancelled) return;

        if (!seeded) {
          setSeeding(true);
          await seedQuestions((current, total) => {
            if (!cancelled) setSeedProgress({ current, total });
          });
          if (cancelled) return;
          setSeeding(false);
        }

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

  return { questions, loading, seeding, seedProgress };
}
