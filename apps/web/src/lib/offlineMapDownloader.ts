/**
 * Offline Map Downloader
 * Downloads map tiles for a bounding box and zoom levels
 */

import { offlineMapCache } from './offlineMapCache';

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface DownloadProgress {
  total: number;
  downloaded: number;
  currentTile: string;
}

// OpenStreetMap tile URL template
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export class OfflineMapDownloader {
  private onProgress?: (progress: DownloadProgress) => void;
  private cancelled = false;

  constructor(onProgress?: (progress: DownloadProgress) => void) {
    this.onProgress = onProgress;
  }

  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Convert lat/lng to tile coordinates
   */
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  /**
   * Get all tiles for a bounding box and zoom level
   */
  private getTilesForBounds(bounds: BoundingBox, zoom: number): Array<{ x: number; y: number; z: number }> {
    const minTile = this.latLngToTile(bounds.north, bounds.west, zoom);
    const maxTile = this.latLngToTile(bounds.south, bounds.east, zoom);

    const tiles: Array<{ x: number; y: number; z: number }> = [];
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
    return tiles;
  }

  /**
   * Download a single tile
   */
  private async downloadTile(tile: { x: number; y: number; z: number }, source: string = 'osm'): Promise<void> {
    if (this.cancelled) throw new Error('Download cancelled');

    // Check if already cached
    const cached = await offlineMapCache.getCachedTile({ ...tile, source });
    if (cached) return;

    // Download tile
    const url = OSM_TILE_URL
      .replace('{z}', tile.z.toString())
      .replace('{x}', tile.x.toString())
      .replace('{y}', tile.y.toString());

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download tile: ${response.statusText}`);
      
      const blob = await response.blob();
      await offlineMapCache.cacheTile({ ...tile, source }, blob);
    } catch (error) {
      console.error(`Failed to download tile ${tile.x}/${tile.y}/${tile.z}:`, error);
      // Continue with other tiles even if one fails
    }
  }

  /**
   * Download all tiles for a bounding box and zoom levels
   */
  async downloadArea(
    bounds: BoundingBox,
    zoomLevels: number[],
    trailId: string,
    polyline?: any[],
    pois?: any[]
  ): Promise<void> {
    this.cancelled = false;

    // Get all tiles for all zoom levels
    const allTiles: Array<{ x: number; y: number; z: number }> = [];
    for (const zoom of zoomLevels) {
      const tiles = this.getTilesForBounds(bounds, zoom);
      allTiles.push(...tiles);
    }

    const total = allTiles.length;
    let downloaded = 0;

    // Download tiles with rate limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < allTiles.length; i += BATCH_SIZE) {
      if (this.cancelled) throw new Error('Download cancelled');

      const batch = allTiles.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (tile) => {
          if (this.cancelled) return;
          const tileKey = `${tile.z}/${tile.x}/${tile.y}`;
          this.onProgress?.({
            total,
            downloaded,
            currentTile: tileKey,
          });
          await this.downloadTile(tile);
          downloaded++;
          this.onProgress?.({
            total,
            downloaded,
            currentTile: tileKey,
          });
        })
      );
    }

    // Cache trail data
    if (polyline) {
      await offlineMapCache.cacheTrailData(trailId, polyline, bounds, zoomLevels);
    }

    // Cache POIs
    if (pois) {
      await offlineMapCache.cachePOIs(trailId, pois);
    }

    // Store download metadata
    await offlineMapCache.setMetadata(`download_${trailId}`, {
      downloadedAt: Date.now(),
      bounds,
      zoomLevels,
    });
  }
}
