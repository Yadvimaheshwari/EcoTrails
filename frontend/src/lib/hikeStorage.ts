/**
 * Hike Storage
 * Persistent storage for active hike sessions using localStorage
 * Ensures hike state survives page refreshes and browser restarts
 */

import { HikeSessionData } from './hikeStateMachine';

const STORAGE_KEY = 'ecotrails_active_hike_session';

/**
 * Save the current hike session to localStorage
 */
export function saveHikeSession(session: HikeSessionData): void {
  try {
    const serialized = JSON.stringify(session);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save hike session:', error);
  }
}

/**
 * Load the active hike session from localStorage
 */
export function loadHikeSession(): HikeSessionData | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const session = JSON.parse(serialized) as HikeSessionData;
    
    // Validate the session has the required structure
    if (!session.state || typeof session.state !== 'string') {
      console.warn('Invalid hike session structure');
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to load hike session:', error);
    return null;
  }
}

/**
 * Clear the active hike session from localStorage
 */
export function clearHikeSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear hike session:', error);
  }
}

/**
 * Check if there's an active hike session
 */
export function hasActiveHikeSession(): boolean {
  const session = loadHikeSession();
  return session !== null && 
         (session.state === 'ACTIVE_HIKE' || session.state === 'PAUSED');
}

/**
 * Store offline map data in localStorage or IndexedDB
 */
export function saveOfflineMapData(trailId: string, mapData: any): void {
  try {
    const key = `offline_map_${trailId}`;
    localStorage.setItem(key, JSON.stringify(mapData));
  } catch (error) {
    console.error('Failed to save offline map:', error);
  }
}

/**
 * Load offline map data
 */
export function loadOfflineMapData(trailId: string): any | null {
  try {
    const key = `offline_map_${trailId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load offline map:', error);
    return null;
  }
}

/**
 * Check if offline map is available for a trail
 */
export function hasOfflineMap(trailId: string): boolean {
  try {
    const key = `offline_map_${trailId}`;
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Store a discovery photo in IndexedDB for offline queuing
 * Falls back to base64 in localStorage if IndexedDB unavailable
 */
export async function storeDiscoveryPhoto(
  discoveryId: string,
  file: File
): Promise<void> {
  try {
    // Try IndexedDB first
    if ('indexedDB' in window) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('EcoTrailsOffline', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('discoveries')) {
            db.createObjectStore('discoveries', { keyPath: 'id' });
          }
        };
        
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          const transaction = db.transaction(['discoveries'], 'readwrite');
          const store = transaction.objectStore('discoveries');
          
          store.put({
            id: discoveryId,
            file: file,
            timestamp: new Date().toISOString(),
          });
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
      });
    } else {
      // Fallback to localStorage with base64
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          try {
            localStorage.setItem(
              `discovery_${discoveryId}`,
              JSON.stringify({
                data: reader.result,
                type: file.type,
                timestamp: new Date().toISOString(),
              })
            );
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    }
  } catch (error) {
    console.error('Failed to store discovery photo:', error);
    throw error;
  }
}

/**
 * Get all pending (unsynced) discoveries
 */
export async function getPendingDiscoveries(): Promise<Array<{ id: string; file: File }>> {
  const discoveries: Array<{ id: string; file: File }> = [];
  
  try {
    if ('indexedDB' in window) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('EcoTrailsOffline', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          const transaction = db.transaction(['discoveries'], 'readonly');
          const store = transaction.objectStore('discoveries');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result || []);
          };
          
          getAllRequest.onerror = () => reject(getAllRequest.error);
        };
      });
    }
  } catch (error) {
    console.error('Failed to get pending discoveries:', error);
  }
  
  return discoveries;
}
