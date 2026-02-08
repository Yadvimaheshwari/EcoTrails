/**
 * Shared Google Maps JS loader (single script tag + shared Promise).
 * Keeps map components from racing/duplicating loads during navigation.
 */
let loadPromise: Promise<void> | null = null;
let lastRequestedSrc: string | null = null;

function buildGoogleMapsSrc(apiKey: string, libraries: string[]) {
  const libs = [...new Set(libraries)].filter(Boolean).sort();
  const librariesParam = libs.length ? `&libraries=${encodeURIComponent(libs.join(','))}` : '';
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${librariesParam}`;
}

export async function loadGoogleMaps(apiKey: string, libraries: string[] = ['geometry']): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser');
  }

  const w = window as any;
  if (w.google?.maps) return;

  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const src = buildGoogleMapsSrc(apiKey, libraries);
  lastRequestedSrc = src;

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // If another loader already placed the script, just wait for it.
    const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null;
    if (existing) {
      // If it already loaded, resolve immediately.
      if (w.google?.maps) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  }).catch((err) => {
    // Allow retry on a later attempt.
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/**
 * Useful for debugging: see which src was last requested by this loader.
 */
export function getLastRequestedGoogleMapsSrc(): string | null {
  return lastRequestedSrc;
}

