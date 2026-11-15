// Force cache-busting reload for iPhone Safari and mobile browsers

export async function forceReloadApp() {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  } catch (e) {
    console.warn("Cache clean error:", e);
  }

  // Add timestamp query parameter to bypass Safari disk and memory cache
  const url = new URL(window.location.href);
  url.searchParams.set('t', Date.now().toString());
  window.location.href = url.toString();
}
