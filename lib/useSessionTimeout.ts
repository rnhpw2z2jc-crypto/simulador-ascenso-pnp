import { useEffect, useRef, useCallback } from 'react';

const TIMEOUT_MS = 30 * 60 * 1000;
const STORAGE_KEY = 'simulador_last_activity';

export function useSessionTimeout(isLoggedIn: boolean, onTimeout: () => void, isPausedInner?: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(isPausedInner);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isLoggedIn) return;
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    timerRef.current = setTimeout(() => {
      localStorage.removeItem(STORAGE_KEY);
      onTimeout();
    }, TIMEOUT_MS);
  }, [isLoggedIn, onTimeout]);

  useEffect(() => {
    pausedRef.current = isPausedInner;
  }, [isPausedInner]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const lastActivity = localStorage.getItem(STORAGE_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - Number(lastActivity);
      if (elapsed >= TIMEOUT_MS) {
        onTimeout();
        return;
      }
    }

    resetTimer();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));

    // Mientras el examen este en pausa, mantener viva la sesion refrescando
    // la actividad para que el timeout de inactividad nunca se cumpla.
    const pauseKeepAlive = setInterval(() => {
      if (pausedRef.current) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        resetTimer();
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(pauseKeepAlive);
      events.forEach(e => document.removeEventListener(e, handler));
    };
  }, [isLoggedIn, onTimeout, resetTimer]);
}
