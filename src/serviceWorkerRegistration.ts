export function registerServiceWorker(onSuccess?: () => void, onError?: (err: any) => void) {
  if ('serviceWorker' in navigator) {
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
}
