/**
 * Hook for detecting offline/online status
 */

import { useState, useEffect } from 'react';

export function useOfflineDetection(): { isOffline: boolean; lastOnline: number | null } {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastOnline, setLastOnline] = useState<number | null>(
    localStorage.getItem('lastOnline') ? parseInt(localStorage.getItem('lastOnline')!, 10) : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      const now = Date.now();
      setLastOnline(now);
      localStorage.setItem('lastOnline', now.toString());
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (navigator.onLine) {
      const now = Date.now();
      setLastOnline(now);
      localStorage.setItem('lastOnline', now.toString());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, lastOnline };
}
