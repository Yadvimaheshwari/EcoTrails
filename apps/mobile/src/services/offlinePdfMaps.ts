import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

import { api } from '../config/api';

export type OfflinePdfDownloadResult =
  | { ok: true; localUri: string; bytes: number; filename: string }
  | { ok: false; reason: string; status?: number };

export type OfflinePdfRecord = {
  placeId: string;
  parkName?: string;
  filename: string;
  localUri: string;
  bytes: number;
  downloadedAt: string; // ISO
  sourceUrl?: string;
};

const INDEX_KEY = 'offline_pdf_index_v1';

function safeSlug(name: string) {
  const s = (name || 'offline-map')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'offline-map';
}

async function readIndex(): Promise<OfflinePdfRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflinePdfRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(items: OfflinePdfRecord[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(items));
}

export async function listOfflinePdfMaps(): Promise<OfflinePdfRecord[]> {
  const items = await readIndex();
  // filter missing files
  const out: OfflinePdfRecord[] = [];
  for (const it of items) {
    try {
      const info = await FileSystem.getInfoAsync(it.localUri);
      if (info.exists) out.push(it);
    } catch {
      // ignore
    }
  }
  if (out.length !== items.length) {
    await writeIndex(out);
  }
  return out;
}

export async function getOfflinePdfMap(placeId: string): Promise<OfflinePdfRecord | null> {
  const items = await listOfflinePdfMaps();
  return items.find((x) => x.placeId === placeId) || null;
}

export async function deleteOfflinePdfMap(placeId: string): Promise<void> {
  const items = await readIndex();
  const existing = items.find((x) => x.placeId === placeId);
  if (existing?.localUri) {
    try {
      await FileSystem.deleteAsync(existing.localUri, { idempotent: true });
    } catch {
      // ignore
    }
  }
  await writeIndex(items.filter((x) => x.placeId !== placeId));
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  // axios keeps auth header in defaults, but for FileSystem we need a plain headers object.
  const h: Record<string, string> = {};
  const auth = (api.defaults.headers.common as any)?.Authorization;
  if (typeof auth === 'string' && auth) h.Authorization = auth;
  return h;
}

export async function openOfflinePdf(localUri: string): Promise<void> {
  if (!localUri) return;
  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(localUri);
    await Linking.openURL(contentUri);
    return;
  }
  await Linking.openURL(localUri);
}

export async function downloadOfflineMapPdfToDevice(params: {
  placeId: string;
  parkName?: string;
}): Promise<OfflinePdfDownloadResult> {
  const { placeId, parkName } = params;
  if (!placeId) return { ok: false, reason: 'Missing placeId' };

  const existing = await getOfflinePdfMap(placeId);
  if (existing) {
    return { ok: true, localUri: existing.localUri, bytes: existing.bytes, filename: existing.filename };
  }

  const base = api.defaults.baseURL || '';
  const url = `${base}/api/v1/places/${encodeURIComponent(placeId)}/offline-map/pdf`;

  const headers = await getAuthHeaders();

  // Probe the endpoint: it can return either PDF bytes or JSON {available:false,...}
  // We fetch only headers first; if it is JSON, we read the body to get a reason.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let contentType = '';
  let status = 0;
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal as any });
    status = res.status;
    contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('application/json')) {
      try {
        const data = await res.json();
        if (data?.available === false) {
          return { ok: false, reason: 'Offline map not available for this park', status };
        }
        if (data?.reason === 'no_nps_match') {
          return { ok: false, reason: 'Offline map not available for this park', status };
        }
        return { ok: false, reason: data?.message || data?.detail || 'Offline map not available for this park', status };
      } catch {
        return { ok: false, reason: 'Offline map not available for this park', status };
      }
    }

    if (!res.ok) {
      return { ok: false, reason: `Download failed (HTTP ${status})`, status };
    }

    if (!contentType.includes('application/pdf')) {
      return { ok: false, reason: 'Offline map not available for this park', status };
    }

    // We only needed the headers; cancel this request and use FileSystem for the actual download.
    controller.abort();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, reason: 'Download timed out. Retry.' };
    }
    // Continue: FileSystem download might still succeed even if this probe failed.
  } finally {
    clearTimeout(timeout);
  }

  const filename = `${safeSlug(parkName || placeId)}-offline-map.pdf`;
  const docDir = (FileSystem as any)?.Paths?.document?.uri as string | undefined;
  const baseDir = docDir || 'file:///';
  const dir = `${baseDir}offline-maps/`;
  const fileUri = `${dir}${filename}`;

  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // ignore
  }

  try {
    const dl = FileSystem.createDownloadResumable(url, fileUri, { headers });
    const result = await dl.downloadAsync();
    if (!result?.uri) return { ok: false, reason: 'Download failed' };

    const info = await FileSystem.getInfoAsync(result.uri);
    const bytes = (info as any)?.size ?? 0;
    if (!info.exists || typeof bytes !== 'number' || bytes <= 10_000) {
      return { ok: false, reason: 'Downloaded file was too small (invalid PDF). Please retry.' };
    }

    const index = await readIndex();
    const rec: OfflinePdfRecord = {
      placeId,
      parkName,
      filename,
      localUri: result.uri,
      bytes,
      downloadedAt: new Date().toISOString(),
      sourceUrl: url,
    };
    await writeIndex([rec, ...index.filter((x) => x.placeId !== placeId)]);

    return { ok: true, localUri: result.uri, bytes, filename };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'Download failed' };
  }
}

