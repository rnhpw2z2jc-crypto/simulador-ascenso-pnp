'use client';

import { useEffect, useState, useCallback } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let removeVisibilityCheck: (() => void) | undefined;

    if ('serviceWorker' in navigator) {
      const launchedAt = Date.now();
      const AUTO_ACTIVATE_WINDOW_MS = 45000;

      // Al abrir la app se puede aplicar la version nueva sin interrumpir
      // un examen en curso. Pasada la ventana, se muestra el aviso normal.
      const activateIfJustLaunched = (worker: ServiceWorker | null) => {
        if (!worker) return;
        if (Date.now() - launchedAt <= AUTO_ACTIVATE_WINDOW_MS) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      navigator.serviceWorker
        .register('/service-worker.js', { updateViaCache: 'none' })
        .then((reg) => {
          // Si quedo una version esperando (tipico en iPhone), se activa ya.
          if (reg.waiting) activateIfJustLaunched(reg.waiting);

          reg.onupdatefound = () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.onstatechange = () => {
              if (newWorker.state !== 'installed') return;
              if (navigator.serviceWorker.controller) {
                setHasUpdate(true);
                activateIfJustLaunched(newWorker);
              }
            };
          };

          // Safari no siempre busca actualizaciones solo: se fuerza aqui.
          reg.update().catch(() => {});
        })
        .catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible') return;
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (!reg) return;
          if (reg.waiting) setHasUpdate(true);
          reg.update().catch(() => {});
        }).catch(() => {});
      };

      document.addEventListener('visibilitychange', checkForUpdate);
      removeVisibilityCheck = () => document.removeEventListener('visibilitychange', checkForUpdate);
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      removeVisibilityCheck?.();
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    setHasUpdate(false);
  }, []);

  return { isInstallable, isInstalled, hasUpdate, install, applyUpdate };
}
