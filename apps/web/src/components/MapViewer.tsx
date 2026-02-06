'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { offlineMapCache } from '@/lib/offlineMapCache';
import { OfflineMapDownloader } from '@/lib/offlineMapDownloader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { MarauderMapViewer } from '@/components/MarauderMapViewer';
import { LeafletOfflineMap } from '@/components/LeafletOfflineMap';
import { format } from 'date-fns';

interface MapViewerProps {
  trailId: string;
  trailName: string;
  polyline?: Array<{ lat: number; lng: number }>;
  pois?: Array<{ lat: number; lng: number; name: string; type: string }>;
  boundingBox?: { north: number; south: number; east: number; west: number };
  zoomLevels?: number[];
  googleMapsApiKey?: string;
  metadata?: {
    difficulty?: string;
    regulations?: string[];
    seasonal_notes?: string[];
    region?: string;
    elevation_range?: { min: number; max: number };
  };
}

type MapMode = 'online' | 'offline' | 'marauder';

const GOOGLE_MAPS_LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ['places', 'geometry'];

export function MapViewer({
  trailId,
  trailName,
  polyline,
  pois,
  boundingBox,
  zoomLevels = [10, 11, 12, 13, 14, 15],
  googleMapsApiKey,
  metadata,
}: MapViewerProps) {
  const { isOffline, lastOnline } = useOfflineDetection();
  const [mapMode, setMapMode] = useState<MapMode>('online');
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ total: 0, downloaded: 0, currentTile: '' });
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const downloaderRef = useRef<OfflineMapDownloader | null>(null);

  // Load map mode preference
  useEffect(() => {
    loadMapModePreference();
    checkDownloadStatus();
  }, [trailId]);

  // Auto-switch to offline mode if network is unavailable
  useEffect(() => {
    if (isOffline && mapMode === 'online') {
      setMapMode('offline');
    }
  }, [isOffline, mapMode]);

  // Render map when mode or data changes
  useEffect(() => {
    if (mapMode === 'online' && mapRef.current && polyline && polyline.length > 0) {
      fitMapToBounds();
    }
  }, [mapMode, polyline, pois, trailId]);

  const loadMapModePreference = async () => {
    try {
      await offlineMapCache.init();
      const preference = await offlineMapCache.getMapModePreference(trailId);
      if (preference) {
        setMapMode(preference);
      } else {
        // Default to offline if network is unavailable, otherwise online
        setMapMode(isOffline ? 'offline' : 'online');
      }
    } catch (error) {
      console.error('Failed to load map mode preference:', error);
      setMapMode(isOffline ? 'offline' : 'online');
    }
  };

  const saveMapModePreference = async (mode: MapMode) => {
    try {
      await offlineMapCache.init();
      // Only save online/offline preferences, marauder is a special mode
      if (mode === 'online' || mode === 'offline') {
        await offlineMapCache.setMapModePreference(trailId, mode);
      }
    } catch (error) {
      console.error('Failed to save map mode preference:', error);
    }
  };

  const handleModeToggle = (newMode: MapMode) => {
    // Instant switch - don't await
    setMapMode(newMode);
    // Save preference in background
    saveMapModePreference(newMode).catch(console.error);
  };

  const checkDownloadStatus = async () => {
    try {
      await offlineMapCache.init();
      const status = await offlineMapCache.getDownloadStatus(trailId);
      setIsDownloaded(status.downloaded);
      setDownloadedAt(status.downloadedAt);
    } catch (error) {
      console.error('Failed to check download status:', error);
    }
  };

  const handleDownload = async () => {
    if (!boundingBox) {
      alert('Bounding box is required for download');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ total: 0, downloaded: 0, currentTile: '' });

    try {
      await offlineMapCache.init();
      const downloader = new OfflineMapDownloader((progress) => {
        setDownloadProgress(progress);
      });
      downloaderRef.current = downloader;

      await downloader.downloadArea(boundingBox, zoomLevels, trailId, polyline, pois);
      
      setIsDownloaded(true);
      setDownloadedAt(Date.now());
      alert('Map downloaded successfully!');
    } catch (error: any) {
      if (error.message !== 'Download cancelled') {
        console.error('Download failed:', error);
        alert(`Download failed: ${error.message}`);
      }
    } finally {
      setIsDownloading(false);
      downloaderRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    if (downloaderRef.current) {
      downloaderRef.current.cancel();
      setIsDownloading(false);
      downloaderRef.current = null;
    }
  };

  const handleDeleteDownload = async () => {
    if (!confirm('Are you sure you want to delete the downloaded map?')) return;

    try {
      await offlineMapCache.clearTrailData(trailId);
      setIsDownloaded(false);
      setDownloadedAt(null);
    } catch (error) {
      console.error('Failed to delete download:', error);
      alert('Failed to delete downloaded map');
    }
  };

  const fitMapToBounds = () => {
    if (!mapRef.current || !polyline || polyline.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    polyline.forEach((point) => {
      bounds.extend(new google.maps.LatLng(point.lat, point.lng));
    });
    mapRef.current.fitBounds(bounds);
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (polyline && polyline.length > 0) {
      fitMapToBounds();
    }
  }, [polyline]);

  // Calculate center and bounds for Google Maps
  const getMapCenter = () => {
    if (polyline && polyline.length > 0) {
      const avgLat = polyline.reduce((sum, p) => sum + p.lat, 0) / polyline.length;
      const avgLng = polyline.reduce((sum, p) => sum + p.lng, 0) / polyline.length;
      return { lat: avgLat, lng: avgLng };
    }
    if (boundingBox) {
      return {
        lat: (boundingBox.north + boundingBox.south) / 2,
        lng: (boundingBox.east + boundingBox.west) / 2,
      };
    }
    return { lat: 0, lng: 0 };
  };

  const polylinePath = polyline?.map(p => ({ lat: p.lat, lng: p.lng })) || [];

  // If no Google Maps API key, fallback to offline mode
  const effectiveMode = !googleMapsApiKey ? 'offline' : mapMode;

  return (
    <div className="space-y-4">
      {/* Mode Toggle and Status */}
      <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: isOffline ? '#FFF8F0' : '#E8F4F8', border: `1px solid ${isOffline ? '#F4A34040' : '#4C7EF340'}` }}>
        <div className="flex items-center gap-3">
          {isOffline ? (
            <>
              <span className="text-2xl">📴</span>
              <div>
                <div className="font-medium text-text">Offline Mode</div>
                <div className="text-xs text-textSecondary">
                  {isDownloaded 
                    ? 'Using cached map data' 
                    : 'No offline map available'}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="text-2xl">📶</span>
              <div>
                <div className="font-medium text-text">Online</div>
                {lastOnline && (
                  <div className="text-xs text-textSecondary">
                    Last online: {format(new Date(lastOnline), 'MMM d, h:mm a')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDownloaded && downloadedAt && (
            <div className="text-right mr-4">
              <div className="text-xs font-medium text-text">Downloaded</div>
              <div className="text-xs text-textSecondary">
                {format(new Date(downloadedAt), 'MMM d, yyyy')}
              </div>
            </div>
          )}
          {!isOffline && (
            <div className="flex gap-2">
              {googleMapsApiKey && (
                <button
                  onClick={() => handleModeToggle('online')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    effectiveMode === 'online'
                      ? 'text-white'
                      : 'text-textSecondary'
                  }`}
                  style={{
                    backgroundColor: effectiveMode === 'online' ? '#4F8A6B' : '#FAFAF8',
                    border: effectiveMode === 'online' ? 'none' : '1px solid #E8E8E3',
                  }}
                >
                  Online
                </button>
              )}
              <button
                onClick={() => handleModeToggle('offline')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  effectiveMode === 'offline'
                    ? 'text-white'
                    : 'text-textSecondary'
                }`}
                style={{
                  backgroundColor: effectiveMode === 'offline' ? '#4F8A6B' : '#FAFAF8',
                  border: effectiveMode === 'offline' ? 'none' : '1px solid #E8E8E3',
                }}
              >
                Offline
              </button>
              <button
                onClick={() => handleModeToggle('marauder')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  effectiveMode === 'marauder'
                    ? 'text-white'
                    : 'text-textSecondary'
                }`}
                style={{
                  backgroundColor: effectiveMode === 'marauder' ? '#8B6F47' : '#FAFAF8',
                  border: effectiveMode === 'marauder' ? 'none' : '1px solid #E8E8E3',
                }}
              >
                🗺️ Marauder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Download Controls */}
      {!isOffline && effectiveMode === 'online' && (
        <div className="flex gap-2">
          {!isDownloaded ? (
            <button
              onClick={handleDownload}
              disabled={isDownloading || !boundingBox}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#4F8A6B' }}
            >
              {isDownloading ? 'Downloading...' : '📥 Download Map for Offline'}
            </button>
          ) : (
            <button
              onClick={handleDeleteDownload}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3', color: '#5F6F6A' }}
            >
              🗑️ Delete Download
            </button>
          )}
          {isDownloading && (
            <button
              onClick={handleCancelDownload}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34040', color: '#F4A340' }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && downloadProgress.total > 0 && (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E8E3' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text">Downloading tiles...</span>
            <span className="text-sm text-textSecondary">
              {downloadProgress.downloaded} / {downloadProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%` }}
            />
          </div>
          {downloadProgress.currentTile && (
            <div className="text-xs text-textSecondary mt-2">
              Current: {downloadProgress.currentTile}
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      {effectiveMode === 'marauder' ? (
        <MarauderMapViewer
          trailId={trailId}
          trailName={trailName}
          polyline={polyline}
          pois={pois}
          boundingBox={boundingBox}
          metadata={metadata}
        />
      ) : effectiveMode === 'online' && googleMapsApiKey ? (
        <LoadScript
          googleMapsApiKey={googleMapsApiKey}
          libraries={GOOGLE_MAPS_LIBRARIES}
        >
          <GoogleMap
            mapContainerStyle={{
              width: '100%',
              height: '600px',
            }}
            center={getMapCenter()}
            zoom={13}
            onLoad={onMapLoad}
            options={{
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
              zoomControl: true,
            }}
          >
            {/* Trail Polyline */}
            {polylinePath.length > 0 && (
              <Polyline
                path={polylinePath}
                options={{
                  strokeColor: '#4F8A6B',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                }}
              />
            )}

            {/* POIs */}
            {pois?.map((poi, idx) => (
              <Marker
                key={idx}
                position={{ lat: poi.lat, lng: poi.lng }}
                title={poi.name}
                onClick={() => setSelectedPOI(poi)}
                icon={{
                  url: poi.type === 'waypoint' 
                    ? 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#F4A340" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>')
                    : 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#4C7EF3" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'),
                  scaledSize: new google.maps.Size(24, 24),
                }}
              />
            ))}

            {/* POI Info Window */}
            {selectedPOI && (
              <InfoWindow
                position={{ lat: selectedPOI.lat, lng: selectedPOI.lng }}
                onCloseClick={() => setSelectedPOI(null)}
              >
                <div>
                  <div className="font-medium">{selectedPOI.name}</div>
                  {selectedPOI.type && (
                    <div className="text-sm text-textSecondary capitalize">{selectedPOI.type}</div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      ) : (
        <LeafletOfflineMap
          center={getMapCenter()}
          zoom={13}
          polyline={polyline}
          pois={pois}
          boundingBox={boundingBox}
          height="600px"
          interactive={true}
          className="rounded-2xl overflow-hidden"
        />
      )}
    </div>
  );
}
