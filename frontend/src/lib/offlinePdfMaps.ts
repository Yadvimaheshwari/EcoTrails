/**
 * Offline PDF Maps (per-park official printable maps)
 *
 * Flow:
 * - Backend resolves + downloads official PDFs/JPGs per park
 * - Frontend fetches the file and stores it in IndexedDB for true offline viewing
 */

import { openDB, IDBPDatabase } from 'idb';
import { api } from './api';

export type OfflineAssetStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'failed';

export interface OfflineMapAsset {
  id: string;
  parkId: string;
  title: string;
  sourceUrl: string;
  fileType: 'pdf' | 'jpg' | 'png' | string;
  bytes?: number | null;
  checksum?: string | null;
  downloadedAt?: string | null;
  status: OfflineAssetStatus | string;
  error?: string | null;
}

interface StoredOfflineAsset extends OfflineMapAsset {
  blob: Blob;
  storedAt: string;
}

const DB_NAME = 'ecotrails-offline-pdf-maps';
const DB_VERSION = 1;

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('assets')) {
        const store = db.createObjectStore('assets', { keyPath: 'id' });
        store.createIndex('parkId', 'parkId');
      }
    },
  });
}

export async function listRemoteParkAssets(parkId: string): Promise<OfflineMapAsset[]> {
  const res = await api.get(`/api/v1/parks/${parkId}/offline-maps`);
  return (res.data?.assets || []) as OfflineMapAsset[];
}

export async function getLocalParkAssets(parkId: string): Promise<StoredOfflineAsset[]> {
  const db = await getDB();
  const idx = db.transaction('assets', 'readonly').store.index('parkId');
  return (await idx.getAll(parkId)) as StoredOfflineAsset[];
}

export async function downloadParkOfflineMaps(
  parkId: string,
  options?: { onProgress?: (msg: string) => void }
): Promise<{ success: boolean; message?: string; assets: OfflineMapAsset[] }> {
  options?.onProgress?.('Resolving official maps...');
  const res = await api.post(`/api/v1/parks/${parkId}/offline-maps/download`);

  if (!res.data?.success) {
    return { success: false, message: res.data?.message, assets: [] };
  }

  const assets = (res.data?.assets || []) as OfflineMapAsset[];
  const db = await getDB();

  // Download and store blobs (this is what enables offline viewing in the browser)
  for (const a of assets) {
    if (a.status !== 'downloaded') continue;
    options?.onProgress?.(`Downloading ${a.title}...`);

    const fileRes = await api.get(`/api/v1/offline-maps/${a.id}/file`, {
      responseType: 'blob',
    });
    const blob = fileRes.data as Blob;
    const stored: StoredOfflineAsset = {
      ...a,
      blob,
      storedAt: new Date().toISOString(),
    };
    await db.put('assets', stored);
  }

  return { success: true, assets };
}

export async function getLocalAssetBlobUrl(assetId: string): Promise<string | null> {
  const db = await getDB();
  const item = (await db.get('assets', assetId)) as StoredOfflineAsset | undefined;
  if (!item?.blob) return null;
  return URL.createObjectURL(item.blob);
}

