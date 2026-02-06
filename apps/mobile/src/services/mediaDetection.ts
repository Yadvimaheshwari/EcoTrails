import * as MediaLibrary from 'expo-media-library';
import { dbService } from './offlineQueue';

export interface DetectedMedia {
  uri: string;
  type: 'photo' | 'video';
  creationTime: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  width?: number;
  height?: number;
  duration?: number;
}

export async function detectMediaDuringHike(
  hikeStartTime: Date,
  hikeEndTime: Date
): Promise<DetectedMedia[]> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    return [];
  }

  const startTimestamp = hikeStartTime.getTime();
  const endTimestamp = hikeEndTime.getTime();

  const albums = await MediaLibrary.getAlbumsAsync();
  const cameraAlbum = albums.find((album) => album.title === 'Camera' || album.title === 'All Photos');

  if (!cameraAlbum) {
    return [];
  }

  const assets = await MediaLibrary.getAssetsAsync({
    album: cameraAlbum,
    mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
    sortBy: MediaLibrary.SortBy.creationTime,
    first: 1000,
  });

  const detectedMedia: DetectedMedia[] = [];

  for (const asset of assets.assets) {
    const creationTime = asset.creationTime * 1000;

    if (creationTime >= startTimestamp && creationTime <= endTimestamp) {
      const mediaInfo = await MediaLibrary.getAssetInfoAsync(asset);

      detectedMedia.push({
        uri: asset.uri,
        type: asset.mediaType === MediaLibrary.MediaType.photo ? 'photo' : 'video',
        creationTime,
        location: mediaInfo.location
          ? {
              latitude: mediaInfo.location.latitude,
              longitude: mediaInfo.location.longitude,
            }
          : undefined,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
      });
    }
  }

  return detectedMedia;
}

export async function addDetectedMediaToQueue(
  hikeId: string,
  media: DetectedMedia[]
): Promise<void> {
  for (const item of media) {
    await dbService.addMediaToQueue(hikeId, item.uri, item.type, {
      timestamp: new Date(item.creationTime).toISOString(),
      location: item.location,
      width: item.width,
      height: item.height,
      duration: item.duration,
    });
  }
}
