import axios from 'axios';
import type { Hike, JournalEntry, Media } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Auth
export async function sendMagicLink(email: string) {
  return api.post('/api/v1/auth/magic-link', { email });
}

export async function verifyMagicLink(token: string) {
  return api.get('/api/v1/auth/verify', { params: { token } });
}

// Places
export async function searchPlaces(query: string, limit = 20) {
  return api.get('/api/v1/places/search', { params: { query, limit } });
}

export async function findNearbyPlaces(lat: number, lng: number, radius = 50, limit = 20) {
  return api.get('/api/v1/places/nearby', { params: { lat, lng, radius, limit } });
}

export async function getPlace(id: string) {
  return api.get(`/api/v1/places/${id}`);
}

export async function getPlaceWeather(id: string) {
  return api.get(`/api/v1/places/${id}/weather`);
}

export async function getPlaceAlerts(id: string) {
  return api.get(`/api/v1/places/${id}/alerts`);
}

export async function getPlaceTrails(id: string) {
  return api.get(`/api/v1/places/${id}/trails`);
}

// Favorites
export async function favoritePlace(placeId: string, plannedVisitDate?: string) {
  const params = plannedVisitDate ? { planned_visit_date: plannedVisitDate } : {};
  return api.post(`/api/v1/places/${placeId}/favorite`, null, { params });
}

export async function unfavoritePlace(placeId: string) {
  return api.delete(`/api/v1/places/${placeId}/favorite`);
}

export async function checkFavorite(placeId: string) {
  return api.get(`/api/v1/places/${placeId}/favorite`);
}

export async function getFavorites() {
  return api.get('/api/v1/favorites');
}

// Trip Planning
export async function planTrip(placeId: string, visitDate: string) {
  return api.post(`/api/v1/places/${placeId}/plan-trip`, null, { params: { visit_date: visitDate } });
}

// Trail Maps
export async function getTrailMap(trailId: string) {
  return api.get(`/api/v1/trails/${trailId}/map`);
}

export async function getTrailRoute(trailId: string) {
  return api.get(`/api/v1/trails/${trailId}/route`);
}

// Companion
export async function identifyImage(imageFile: File, location?: { lat: number; lng: number }, trailContext?: string) {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (location) {
    formData.append('location', JSON.stringify(location));
  }
  if (trailContext) {
    formData.append('trail_context', trailContext);
  }
  return api.post('/api/v1/companion/identify-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export async function identifyAudio(audioFile: File, location?: { lat: number; lng: number }, trailContext?: string) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  if (location) {
    formData.append('location', JSON.stringify(location));
  }
  if (trailContext) {
    formData.append('trail_context', trailContext);
  }
  return api.post('/api/v1/companion/identify-audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export async function getTrailVegetation(trailId: string) {
  return api.get(`/api/v1/trails/${trailId}/vegetation`);
}

export async function suggestNextAction(
  currentLocation: { lat: number; lng: number },
  trailProgress: number,
  timeOfDay: string,
  trailContext?: string
) {
  return api.post('/api/v1/companion/suggest-action', null, {
    params: {
      current_location: JSON.stringify(currentLocation),
      trail_progress: trailProgress,
      time_of_day: timeOfDay,
      trail_context: trailContext
    }
  });
}

export async function searchTrails(query: string, filters?: any, limit = 20) {
  return api.get('/api/v1/trails/search', { params: { query, ...filters, limit } });
}

export async function getTrail(id: string) {
  return api.get(`/api/v1/trails/${id}`);
}

// Hikes
export async function getHikes(status?: string, limit = 50, offset = 0) {
  return api.get<{ hikes: Hike[] }>('/api/v1/hikes', { params: { status, limit, offset } });
}

export async function getHike(id: string) {
  return api.get<{ data: Hike }>(`/api/v1/hikes/${id}`);
}

export async function updateHike(id: string, data: { name?: string; [key: string]: any }) {
  return api.patch(`/api/v1/hikes/${id}`, data);
}

export async function createHike(trailId?: string, placeId?: string) {
  const params = new URLSearchParams();
  if (trailId) params.append('trail_id', trailId);
  if (placeId) params.append('place_id', placeId);
  return api.post(`/api/v1/hikes?${params.toString()}`);
}

// Insights
export async function getInsightStatus(hikeId: string) {
  return api.get(`/api/v1/hikes/${hikeId}/insights/status`);
}

export async function getInsightReport(hikeId: string) {
  return api.get(`/api/v1/hikes/${hikeId}/insights`);
}

export async function startAnalysis(hikeId: string) {
  return api.post(`/api/v1/hikes/${hikeId}/insights/start`);
}

export async function generateHikeSummary(hikeId: string) {
  return api.post(`/api/v1/hikes/${hikeId}/generate-summary`);
}

// Media
export async function getSignedUploadUrl(hikeId: string, contentType: string, category?: string) {
  return api.post(`/api/v1/hikes/${hikeId}/media/upload-url`, { contentType, category });
}

export async function registerUploadedMedia(mediaId: string, sizeBytes: number, metadata?: any) {
  return api.post(`/api/v1/media/${mediaId}/register`, { sizeBytes, metadata });
}

export async function uploadHikeMedia(
  hikeId: string, 
  file: File, 
  type: 'photo' | 'video' | 'audio',
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  return api.post<Media>(`/api/v1/hikes/${hikeId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });
}

// Achievements
export async function getUserAchievements(category?: string, limit = 100) {
  return api.get('/api/v1/achievements/mine', { params: { category, limit } });
}

export async function getAllAchievements(category?: string, rarity?: string) {
  return api.get('/api/v1/achievements', { params: { category, rarity } });
}

export async function getParkBadges() {
  return api.get('/api/v1/achievements/park-badges');
}

// Devices
export async function getUserDevices() {
  return api.get('/api/v1/devices');
}

export async function registerDevice(data: any) {
  return api.post('/api/v1/devices', data);
}

export async function updateDeviceStatus(deviceId: string, status: string, metadata?: any) {
  return api.patch(`/api/v1/devices/${deviceId}/status`, { status, metadata });
}

export async function removeDevice(deviceId: string) {
  return api.delete(`/api/v1/devices/${deviceId}`);
}

// Journal
export async function getJournalEntries(hikeId?: string, entryType?: string, limit = 50) {
  const params: Record<string, string | number> = { limit };
  if (hikeId) params.hike_id = hikeId;
  if (entryType) params.entry_type = entryType;
  return api.get<{ entries: JournalEntry[] }>('/api/v1/journal', { params });
}

export async function createJournalEntry(
  title: string,
  content: string,
  hikeId?: string,
  entryType?: string,
  metadata?: any
) {
  return api.post('/api/v1/journal', {
    title,
    content,
    hike_id: hikeId,
    entry_type: entryType,
    metadata,
  });
}

export async function updateJournalEntry(entryId: string, data: { title?: string; content?: string; metadata?: any }) {
  return api.patch(`/api/v1/journal/${entryId}`, data);
}

export async function generateHikeNarrative(hikeId: string) {
  return api.post(`/api/v1/hikes/${hikeId}/generate-narrative`);
}

// Media Enhancement
export async function startMediaEnhancement(mediaId: string, options: { lighting?: string; style?: string; enhance_subject?: boolean; remove_shadows?: boolean; background_replacement?: boolean }) {
  return api.post(`/api/v1/media/${mediaId}/enhance`, options);
}

export async function getMediaEnhancementJobs(mediaId: string) {
  return api.get(`/api/v1/media/${mediaId}/enhancement-jobs`);
}

export async function getEnhancementJobStatus(jobId: string) {
  return api.get(`/api/v1/enhancement-jobs/${jobId}`);
}

export async function cancelEnhancementJob(jobId: string) {
  return api.post(`/api/v1/enhancement-jobs/${jobId}/cancel`);
}

// Dashboard Stats
export async function getDashboardStats() {
  return api.get('/api/v1/dashboard/stats');
}

// Offline Maps
export async function downloadOfflineMap(placeId: string, trailId?: string) {
  return api.post('/api/v1/maps/offline', { placeId, trailId });
}

export async function getOfflineMapStatus(placeId: string) {
  return api.get(`/api/v1/maps/offline/${placeId}/status`);
}

// Community / Social
export async function getCommunityFeed(limit = 20, offset = 0, postType?: string, placeId?: string) {
  const params: Record<string, string | number> = { limit, offset };
  if (postType) params.post_type = postType;
  if (placeId) params.place_id = placeId;
  return api.get('/api/v1/community/feed', { params });
}

export async function createCommunityPost(data: {
  content: string;
  post_type?: string;
  hike_id?: string;
  place_id?: string;
  media_urls?: string[];
  location?: { lat: number; lng: number; name?: string };
  tags?: string[];
}) {
  return api.post('/api/v1/community/posts', data);
}

export async function getCommunityPost(postId: string) {
  return api.get(`/api/v1/community/posts/${postId}`);
}

export async function addPostComment(postId: string, content: string) {
  return api.post(`/api/v1/community/posts/${postId}/comments`, { content });
}

export async function togglePostLike(postId: string) {
  return api.post(`/api/v1/community/posts/${postId}/like`);
}

export async function deletePost(postId: string) {
  return api.delete(`/api/v1/community/posts/${postId}`);
}

export async function getUserPosts(userId: string, limit = 20, offset = 0) {
  return api.get(`/api/v1/community/users/${userId}/posts`, { params: { limit, offset } });
}

// Start Hike (alternative endpoint)
export async function startHike(placeId: string, trailId?: string) {
  const params = new URLSearchParams();
  params.append('place_id', placeId);
  if (trailId) params.append('trail_id', trailId);
  return api.post(`/api/v1/hikes/start?${params.toString()}`);
}
