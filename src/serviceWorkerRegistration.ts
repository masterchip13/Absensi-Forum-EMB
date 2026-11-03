export function registerServiceWorker(onSuccess?: () => void, onError?: (err: any) => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // In development, never allow service worker to intercept Vite module chunks.
  // Unregister any existing service workers and clear stale caches immediately.
  const isDev = Boolean((import.meta as any).env?.DEV);
  if (isDev) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('[Dev] Unregistered stale service worker:', registration.scope);
        });
      }
    });

    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        for (const name of cacheNames) {
          caches.delete(name);
        }
      });
    }
    return;
  }

  // Production registration
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registered successfully:', registration.scope);
        if (onSuccess) onSuccess();
      })
      .catch((error) => {
        console.warn('[PWA] ServiceWorker registration failed:', error);
        if (onError) onError(error);
      });
  });
}

