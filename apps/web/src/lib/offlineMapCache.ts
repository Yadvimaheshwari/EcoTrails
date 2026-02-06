/**
 * Offline Map Cache Service
 * Uses IndexedDB to cache map tiles, trail polylines, and POIs
 */

const DB_NAME = 'EcoAtlasOfflineMaps';
const DB_VERSION = 1;
const TILES_STORE = 'tiles';
const TRAILS_STORE = 'trails';
const POIS_STORE = 'pois';
const METADATA_STORE = 'metadata';

interface TileKey {
  x: number;
  y: number;
  z: number;
  source: string;
}

interface CachedTile {
  key: string;
  blob: Blob;
  timestamp: number;
}

interface TrailData {
  trailId: string;
  polyline: any[];
  boundingBox: { north: number; south: number; east: number; west: number };
  zoomLevels: number[];
  downloadedAt: number;
}

interface POIData {
  trailId: string;
  pois: any[];
  downloadedAt: number;
}

class OfflineMapCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Tiles store
        if (!db.objectStoreNames.contains(TILES_STORE)) {
          const tilesStore = db.createObjectStore(TILES_STORE, { keyPath: 'key' });
          tilesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Trails store
        if (!db.objectStoreNames.contains(TRAILS_STORE)) {
          const trailsStore = db.createObjectStore(TRAILS_STORE, { keyPath: 'trailId' });
          trailsStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // POIs store
        if (!db.objectStoreNames.contains(POIS_STORE)) {
          const poisStore = db.createObjectStore(POIS_STORE, { keyPath: 'trailId' });
          poisStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  // Tile caching
  async cacheTile(key: TileKey, blob: Blob): Promise<void> {
    const db = await this.ensureDB();
    const tileKey = `${key.source}/${key.z}/${key.x}/${key.y}`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILES_STORE], 'readwrite');
      const store = transaction.objectStore(TILES_STORE);
      const cachedTile: CachedTile = {
        key: tileKey,
        blob,
        timestamp: Date.now(),
      };
      const request = store.put(cachedTile);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedTile(key: TileKey): Promise<Blob | null> {
    const db = await this.ensureDB();
    const tileKey = `${key.source}/${key.z}/${key.x}/${key.y}`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILES_STORE], 'readonly');
      const store = transaction.objectStore(TILES_STORE);
      const request = store.get(tileKey);
      request.onsuccess = () => {
        const result = request.result as CachedTile | undefined;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldTiles(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - maxAge;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILES_STORE], 'readwrite');
      const store = transaction.objectStore(TILES_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Trail data caching
  async cacheTrailData(trailId: string, polyline: any[], boundingBox: { north: number; south: number; east: number; west: number }, zoomLevels: number[]): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRAILS_STORE], 'readwrite');
      const store = transaction.objectStore(TRAILS_STORE);
      const trailData: TrailData = {
        trailId,
        polyline,
        boundingBox,
        zoomLevels,
        downloadedAt: Date.now(),
      };
      const request = store.put(trailData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedTrailData(trailId: string): Promise<TrailData | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRAILS_STORE], 'readonly');
      const store = transaction.objectStore(TRAILS_STORE);
      const request = store.get(trailId);
      request.onsuccess = () => {
        resolve(request.result as TrailData | null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // POI caching
  async cachePOIs(trailId: string, pois: any[]): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([POIS_STORE], 'readwrite');
      const store = transaction.objectStore(POIS_STORE);
      const poiData: POIData = {
        trailId,
        pois,
        downloadedAt: Date.now(),
      };
      const request = store.put(poiData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedPOIs(trailId: string): Promise<POIData | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([POIS_STORE], 'readonly');
      const store = transaction.objectStore(POIS_STORE);
      const request = store.get(trailId);
      request.onsuccess = () => {
        resolve(request.result as POIData | null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Metadata
  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Check if trail is downloaded
  async isTrailDownloaded(trailId: string): Promise<boolean> {
    const trailData = await this.getCachedTrailData(trailId);
    return trailData !== null;
  }

  // Get download status
  async getDownloadStatus(trailId: string): Promise<{ downloaded: boolean; downloadedAt: number | null }> {
    const trailData = await this.getCachedTrailData(trailId);
    return {
      downloaded: trailData !== null,
      downloadedAt: trailData?.downloadedAt || null,
    };
  }

  // Clear all data for a trail
  async clearTrailData(trailId: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRAILS_STORE, POIS_STORE], 'readwrite');
      
      const trailsRequest = transaction.objectStore(TRAILS_STORE).delete(trailId);
      const poisRequest = transaction.objectStore(POIS_STORE).delete(trailId);
      
      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) resolve();
      };
      
      trailsRequest.onsuccess = checkComplete;
      poisRequest.onsuccess = checkComplete;
      trailsRequest.onerror = () => reject(trailsRequest.error);
      poisRequest.onerror = () => reject(poisRequest.error);
    });
  }

  // Map mode preference (online/offline)
  async setMapModePreference(trailId: string, mode: 'online' | 'offline'): Promise<void> {
    return this.setMetadata(`map_mode_${trailId}`, mode);
  }

  async getMapModePreference(trailId: string): Promise<'online' | 'offline' | null> {
    return this.getMetadata(`map_mode_${trailId}`);
  }
}

export const offlineMapCache = new OfflineMapCache();
