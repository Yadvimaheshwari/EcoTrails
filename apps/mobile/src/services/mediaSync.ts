import { api } from '../config/api';
import { dbService } from './offlineQueue';
import * as FileSystem from 'expo-file-system';

interface QueuedMedia {
  id: number;
  hikeId: string;
  uri: string;
  type: string;
  metadata?: string;
  synced: number;
}

export async function syncMediaQueue(
  items: QueuedMedia[],
  onProgress?: (itemId: number, progress: number) => void
): Promise<void> {
  for (const item of items) {
    if (item.synced === 1) continue;

    try {
      const metadata = item.metadata ? JSON.parse(item.metadata) : {};
      const contentType = item.type === 'photo' ? 'image/jpeg' : item.type === 'video' ? 'video/mp4' : 'audio/m4a';

      // Get signed upload URL
      const urlRes = await getSignedUploadUrl(item.hikeId, contentType, metadata.category);
      const { uploadUrl, mediaId } = urlRes.data;

      // Read file
      const fileInfo = await FileSystem.getInfoAsync(item.uri);
      if (!fileInfo.exists) {
        console.error('File not found:', item.uri);
        continue;
      }

      const fileContent = await FileSystem.readAsStringAsync(item.uri, {
        // SDK 54: `EncodingType` enum is not exported; use string encoding.
        encoding: 'base64' as any,
      });

      const blob = await fetch(`data:${contentType};base64,${fileContent}`).then((r) => r.blob());

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Register media
      await registerUploadedMedia(mediaId, blob.size, {
        width: metadata.width,
        height: metadata.height,
        durationMs: metadata.duration,
        location: metadata.location,
      });

      // Mark as synced
      await dbService.markMediaSynced(item.id);

      onProgress?.(item.id, 100);
    } catch (error) {
      console.error('Failed to sync media:', error);
      onProgress?.(item.id, 0);
      throw error;
    }
  }
}

async function getSignedUploadUrl(hikeId: string, contentType: string, category?: string) {
  return api.post(`/api/v1/hikes/${hikeId}/media/upload-url`, { contentType, category });
}

async function registerUploadedMedia(mediaId: string, sizeBytes: number, metadata?: any) {
  return api.post(`/api/v1/media/${mediaId}/register`, { sizeBytes, metadata });
}
