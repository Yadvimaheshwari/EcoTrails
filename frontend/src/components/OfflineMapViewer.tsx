'use client';

import { useState, useEffect, useRef } from 'react';
import { offlineMapCache } from '@/lib/offlineMapCache';
import { OfflineMapDownloader } from '@/lib/offlineMapDownloader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { LeafletOfflineMap } from '@/components/LeafletOfflineMap';
import { format } from 'date-fns';

interface OfflineMapViewerProps {
  trailId: string;
  trailName: string;
  polyline?: Array<{ lat: number; lng: number }>;
  pois?: Array<{ lat: number; lng: number; name: string; type: string }>;
  boundingBox?: { north: number; south: number; east: number; west: number };
  zoomLevels?: number[];
}

export function OfflineMapViewer({
  trailId,
  trailName,
  polyline,
  pois,
  boundingBox,
  zoomLevels = [10, 11, 12, 13, 14, 15],
}: OfflineMapViewerProps) {
  const { isOffline, lastOnline } = useOfflineDetection();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ total: 0, downloaded: 0, currentTile: '' });
  const downloaderRef = useRef<OfflineMapDownloader | null>(null);

  useEffect(() => {
    checkDownloadStatus();
  }, [trailId]);

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

  const [displayPolyline, setDisplayPolyline] = useState<Array<{ lat: number; lng: number }>>([]);
  const [displayPOIs, setDisplayPOIs] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);
  const [displayBounds, setDisplayBounds] = useState<{ north: number; south: number; east: number; west: number } | undefined>(undefined);

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        await offlineMapCache.init();
        const trailData = await offlineMapCache.getCachedTrailData(trailId);
        const cachedPOIs = await offlineMapCache.getCachedPOIs(trailId);

        setDisplayPolyline(trailData?.polyline || polyline || []);
        setDisplayPOIs(cachedPOIs?.pois || pois || []);
        setDisplayBounds(trailData?.boundingBox || boundingBox);
      } catch (error) {
        console.error('Failed to load cached map data:', error);
        setDisplayPolyline(polyline || []);
        setDisplayPOIs(pois || []);
        setDisplayBounds(boundingBox);
      }
    };
    loadCachedData();
  }, [trailId, polyline, pois, boundingBox]);

  return (
    <div className="space-y-4">
      {/* Offline Badge and Status */}
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
        {isDownloaded && downloadedAt && (
          <div className="text-right">
            <div className="text-xs font-medium text-text">Downloaded</div>
            <div className="text-xs text-textSecondary">
              {format(new Date(downloadedAt), 'MMM d, yyyy')}
            </div>
          </div>
        )}
      </div>

      {/* Download Controls */}
      {!isOffline && (
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
      {displayBounds ? (
        <LeafletOfflineMap
          center={{
            lat: (displayBounds.north + displayBounds.south) / 2,
            lng: (displayBounds.east + displayBounds.west) / 2,
          }}
          zoom={13}
          polyline={displayPolyline}
          pois={displayPOIs}
          boundingBox={displayBounds}
          height="500px"
          interactive={true}
          className="rounded-2xl overflow-hidden"
        />
      ) : (
        <div
          className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ 
            backgroundColor: '#FAFAF8', 
            border: '1px solid #E8E8E3',
            minHeight: '400px',
          }}
        >
          <p className="text-textSecondary">No map data available</p>
        </div>
      )}
    </div>
  );
}
