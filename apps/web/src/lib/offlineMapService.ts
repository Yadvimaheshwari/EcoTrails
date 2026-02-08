/**
 * Offline Map Service
 * Handles downloading and caching of map packs for offline use
 */

import React from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { api } from './api';
import { OfflineMapDownloader } from './offlineMapDownloader';
import { offlineMapCache } from './offlineMapCache';

// Types
export interface OfflinePackStatus {
  parkId: string;
  status: 'not_downloaded' | 'downloading' | 'ready' | 'failed' | 'partial';
  progress: number;
  routeCached: boolean;
  pdfCached: boolean;
  tilesCached: boolean;
  downloadedAt?: string;
  sizeBytes?: number;
}

export interface RouteData {
  hikeId: string;
  trailId: string;
  trailName: string;
  geojson: any;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  downloadedAt: string;
}

export interface ParkMapData {
  parkId: string;
  parkName: string;
  // Kept as pdfUrl for backwards compatibility; may be a PDF or an image URL fallback.
  pdfUrl: string;
  sourceName: string;
  downloadedAt: string;
}

// Constants
const DB_NAME = 'ecotrails-offline';
const DB_VERSION = 1;
const CACHE_NAME = 'park-maps-v1';

// Database setup
async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Routes store
      if (!db.objectStoreNames.contains('routes')) {
        db.createObjectStore('routes', { keyPath: 'hikeId' });
      }
      // Park maps store
      if (!db.objectStoreNames.contains('parkMaps')) {
        db.createObjectStore('parkMaps', { keyPath: 'parkId' });
      }
      // Pack status store
      if (!db.objectStoreNames.contains('packStatus')) {
        db.createObjectStore('packStatus', { keyPath: 'parkId' });
      }
    },
  });
}

/**
 * Offline Map Manager
 */
export class OfflineMapManager {
  private db: IDBPDatabase | null = null;
  private listeners: Map<string, Set<(status: OfflinePackStatus) => void>> = new Map();

  async init(): Promise<void> {
    this.db = await getDB();
  }

  async getPackStatus(parkId: string): Promise<OfflinePackStatus> {
    if (!this.db) await this.init();
    
    const stored = await this.db!.get('packStatus', parkId);
    if (stored) return stored;

    return {
      parkId,
      status: 'not_downloaded',
      progress: 0,
      routeCached: false,
      pdfCached: false,
      tilesCached: false,
    };
  }

  async downloadPack(
    parkId: string,
    options: {
      trailId?: string;
      includePdf?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<void> {
    if (!this.db) await this.init();

    const { trailId, includePdf = true, onProgress } = options;
    
    // Update status to downloading
    await this.updateStatus(parkId, {
      status: 'downloading',
      progress: 0,
    });

    try {
      // Step 1: Download route GeoJSON (if trailId provided)
      let boundsForTiles: { north: number; south: number; east: number; west: number } | null = null;
      let polylineForTiles: Array<{ lat: number; lng: number }> | undefined = undefined;

      if (trailId) {
        const route = await this.downloadRoute(trailId, parkId);
        boundsForTiles = route?.bounds || null;
        polylineForTiles = this.extractPolylineFromGeoJSON(route?.geojson);
        await this.updateStatus(parkId, { progress: 25, routeCached: true });
        onProgress?.(25);
      } else {
        await this.updateStatus(parkId, { progress: 25 });
        onProgress?.(25);
      }

      // Step 2: Download OSM tiles for the route bounds (best-effort, works even when PDFs don't exist)
      if (boundsForTiles) {
        try {
          await offlineMapCache.init();
          const downloader = new OfflineMapDownloader();
          // Keep a conservative default zoom set for storage size.
          await downloader.downloadArea(boundsForTiles, [11, 12, 13, 14, 15], trailId || parkId, polylineForTiles);
          await this.updateStatus(parkId, { progress: 55, tilesCached: true });
          onProgress?.(55);
        } catch (e) {
          console.warn('[OfflineMapManager] Tile download failed (non-fatal):', e);
          await this.updateStatus(parkId, { progress: 55, tilesCached: false });
          onProgress?.(55);
        }
      } else {
        await this.updateStatus(parkId, { progress: 55 });
        onProgress?.(55);
      }

      // Step 3: Download official PDF map (or image fallback from backend)
      if (includePdf) {
        const pdfCached = await this.downloadPdfMap(parkId);
        await this.updateStatus(parkId, { progress: 85, pdfCached });
        onProgress?.(85);
      }

      // Step 4: Mark as complete
      await this.updateStatus(parkId, {
        status: 'ready',
        progress: 100,
        downloadedAt: new Date().toISOString(),
      });
      onProgress?.(100);

    } catch (error) {
      console.error('[OfflineMapManager] Download failed:', error);
      await this.updateStatus(parkId, { status: 'failed' });
      throw error;
    }
  }

  private async downloadRoute(trailId: string, parkId: string): Promise<RouteData | null> {
    try {
      const response = await api.get(`/api/v1/trails/${trailId}/route`);
      const routeData: RouteData = {
        hikeId: `offline-${trailId}`,
        trailId,
        trailName: response.data.name || 'Trail',
        geojson: response.data.geojson || response.data.route,
        bounds: response.data.bounds || { north: 0, south: 0, east: 0, west: 0 },
        downloadedAt: new Date().toISOString(),
      };
      await this.db!.put('routes', routeData);
      return routeData;
    } catch (error) {
      console.warn('[OfflineMapManager] Route download failed:', error);
      // Non-fatal, continue with PDF
      return null;
    }
  }

  private extractPolylineFromGeoJSON(geojson: any): Array<{ lat: number; lng: number }> | undefined {
    try {
      if (!geojson) return undefined;
      // FeatureCollection → first LineString-ish feature
      const features = geojson?.features || (geojson?.type === 'Feature' ? [geojson] : []);
      for (const f of features) {
        const geom = f?.geometry || f;
        const t = geom?.type;
        const coords = geom?.coordinates;
        if (t === 'LineString' && Array.isArray(coords)) {
          return coords.map((c: any) => ({ lng: c[0], lat: c[1] }));
        }
        if (t === 'MultiLineString' && Array.isArray(coords) && coords[0]) {
          return coords[0].map((c: any) => ({ lng: c[0], lat: c[1] }));
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async downloadPdfMap(parkId: string): Promise<boolean> {
    try {
      // Get official map URL
      const response = await api.get(`/api/v1/parks/${parkId}/official-map`);
      const pdfUrl = response.data?.pdfUrl || response.data?.mapUrl;
      const sourceName = response.data?.sourceName;

      if (!pdfUrl) {
        console.warn('[OfflineMapManager] No PDF URL for park:', parkId);
        return false;
      }

      // Cache the PDF using Cache API
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        await cache.add(pdfUrl);
      }

      // Store metadata
      const mapData: ParkMapData = {
        parkId,
        parkName: response.data?.parkName || 'Park',
        pdfUrl,
        sourceName: sourceName || 'Official Map',
        downloadedAt: new Date().toISOString(),
      };
      await this.db!.put('parkMaps', mapData);

      return true;
    } catch (error) {
      console.warn('[OfflineMapManager] PDF download failed:', error);
      return false;
    }
  }

  private async updateStatus(
    parkId: string,
    updates: Partial<OfflinePackStatus>
  ): Promise<void> {
    const current = await this.getPackStatus(parkId);
    const updated = { ...current, ...updates };
    await this.db!.put('packStatus', updated);
    
    // Notify listeners
    const listeners = this.listeners.get(parkId);
    if (listeners) {
      listeners.forEach(cb => cb(updated));
    }
  }

  async deletePack(parkId: string): Promise<void> {
    if (!this.db) await this.init();

    // Delete from IndexedDB
    await this.db!.delete('packStatus', parkId);
    await this.db!.delete('parkMaps', parkId);

    // Delete from Cache Storage
    if ('caches' in window) {
      const mapData = await this.db!.get('parkMaps', parkId) as ParkMapData | undefined;
      if (mapData?.pdfUrl) {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(mapData.pdfUrl);
      }
    }
  }

  async getRoute(trailId: string): Promise<RouteData | null> {
    if (!this.db) await this.init();
    
    // Search for route by trailId
    const tx = this.db!.transaction('routes', 'readonly');
    const store = tx.objectStore('routes');
    const cursor = await store.openCursor();
    
    while (cursor) {
      if (cursor.value.trailId === trailId) {
        return cursor.value;
      }
      await cursor.continue();
    }
    
    return null;
  }

  async getPdfUrl(parkId: string): Promise<string | null> {
    if (!this.db) await this.init();
    
    const mapData = await this.db!.get('parkMaps', parkId) as ParkMapData | undefined;
    return mapData?.pdfUrl || null;
  }

  async isPdfCached(pdfUrl: string): Promise<boolean> {
    if (!('caches' in window)) return false;
    
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(pdfUrl);
    return !!match;
  }

  subscribe(
    parkId: string,
    callback: (status: OfflinePackStatus) => void
  ): () => void {
    if (!this.listeners.has(parkId)) {
      this.listeners.set(parkId, new Set());
    }
    this.listeners.get(parkId)!.add(callback);
    
    return () => {
      this.listeners.get(parkId)?.delete(callback);
    };
  }
}

// Singleton export
export const offlineMapManager = new OfflineMapManager();

// React hook for offline status
export function useOfflinePackStatus(parkId: string): OfflinePackStatus | null {
  const [status, setStatus] = React.useState<OfflinePackStatus | null>(null);

  React.useEffect(() => {
    offlineMapManager.getPackStatus(parkId).then(setStatus);
    
    const unsubscribe = offlineMapManager.subscribe(parkId, setStatus);
    return unsubscribe;
  }, [parkId]);

  return status;
}
