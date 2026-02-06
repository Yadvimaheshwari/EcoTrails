/**
 * HikeStartSheet Component
 * Pre-hike confirmation bottom sheet with system checks
 * Shows trail info, system readiness, and offline map status before starting
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { performSystemChecks, SystemCheck } from '@/lib/hikeStateMachine';
import { hasOfflineMap } from '@/lib/hikeStorage';
import { getTrailMap } from '@/lib/api';

interface HikeStartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStartHike: () => void;
  trailName?: string;
  placeName?: string;
  distance?: number;
  difficulty?: string;
  elevationGain?: number;
  estimatedTime?: number;
  trailId?: string;
  weather?: any;
  loading?: boolean;
}

export function HikeStartSheet({
  isOpen,
  onClose,
  onStartHike,
  trailName,
  placeName,
  distance,
  difficulty,
  elevationGain,
  estimatedTime,
  trailId,
  weather,
  loading = false,
}: HikeStartSheetProps) {
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([]);
  const [checksLoading, setChecksLoading] = useState(true);
  const [offlineMapAvailable, setOfflineMapAvailable] = useState(false);
  const [downloadingMap, setDownloadingMap] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      runSystemChecks();
      checkOfflineMap();
      
      // Enable keyboard handling
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Focus trap
      if (sheetRef.current) {
        sheetRef.current.focus();
      }
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  const runSystemChecks = async () => {
    setChecksLoading(true);
    try {
      const checks = await performSystemChecks(weather, offlineMapAvailable);
      setSystemChecks(checks);
    } catch (error) {
      console.error('Failed to run system checks:', error);
    } finally {
      setChecksLoading(false);
    }
  };

  const checkOfflineMap = () => {
    if (trailId) {
      const available = hasOfflineMap(trailId);
      setOfflineMapAvailable(available);
    }
  };

  const handleDownloadMap = async () => {
    if (!trailId) return;
    
    setDownloadingMap(true);
    try {
      const response = await getTrailMap(trailId);
      console.log('Map response:', response.data);
      
      // Handle official map download
      if (response.data?.source === 'official' && response.data?.map_url) {
        // Store map URL and metadata in localStorage
        const mapData = {
          trailId,
          source: 'official',
          map_url: response.data.map_url,
          map_type: response.data.map_type,
          title: response.data.title,
          downloaded_at: new Date().toISOString()
        };
        
        localStorage.setItem(`offline_map_${trailId}`, JSON.stringify(mapData));
        
        // Open map in new tab so user can download/save it
        window.open(response.data.map_url, '_blank');
        
        setOfflineMapAvailable(true);
        alert(`Official park map opened in new tab. Save it to your device for offline access.`);
      } else if (response.data?.map_data) {
        // Handle AI-generated map
        localStorage.setItem(`offline_map_${trailId}`, JSON.stringify(response.data));
        setOfflineMapAvailable(true);
        alert('Trail map downloaded and saved for offline use.');
      } else {
        throw new Error('No map data in response');
      }
      
      // Re-run system checks to update status
      runSystemChecks();
    } catch (error: any) {
      console.error('Failed to download map:', error);
      alert(`Failed to download offline map: ${error.message || 'Unknown error'}. You can still start the hike with online connectivity.`);
    } finally {
      setDownloadingMap(false);
    }
  };

  const handleStart = () => {
    // Check for critical issues
    const hasCriticalError = systemChecks.some(
      check => check.status === 'error' && check.name === 'GPS/Location'
    );
    
    if (hasCriticalError) {
      const proceed = confirm(
        'Location access is not available. Starting without GPS will limit tracking features. Continue anyway?'
      );
      if (!proceed) return;
    }
    
    onStartHike();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Handle bar (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 rounded-full" style={{ backgroundColor: '#E8E8E3' }} />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: '#E8E8E3' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-light text-text mb-1">Ready to start?</h2>
              <div className="text-sm text-textSecondary">
                {placeName && <span>{placeName}</span>}
                {placeName && trailName && <span> · </span>}
                {trailName && <span>{trailName}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Trail Overview */}
          <div>
            <h3 className="text-sm font-medium text-textSecondary mb-3">Trail overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {distance && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FAFAF8' }}>
                  <div className="text-xs text-textSecondary mb-1">Distance</div>
                  <div className="text-lg font-medium text-text">{distance} mi</div>
                </div>
              )}
              {difficulty && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FAFAF8' }}>
                  <div className="text-xs text-textSecondary mb-1">Difficulty</div>
                  <div className="text-lg font-medium text-text capitalize">{difficulty}</div>
                </div>
              )}
              {elevationGain && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FAFAF8' }}>
                  <div className="text-xs text-textSecondary mb-1">Elevation</div>
                  <div className="text-lg font-medium text-text">+{Math.round(elevationGain)} ft</div>
                </div>
              )}
              {estimatedTime && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FAFAF8' }}>
                  <div className="text-xs text-textSecondary mb-1">Est. time</div>
                  <div className="text-lg font-medium text-text">~{Math.round(estimatedTime / 60)} hr</div>
                </div>
              )}
            </div>
          </div>

          {/* System Checks */}
          <div>
            <h3 className="text-sm font-medium text-textSecondary mb-3">System checks</h3>
            {checksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#4C7EF3' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {systemChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      backgroundColor:
                        check.status === 'error' ? '#FEE2E2' :
                        check.status === 'warning' ? '#FFF8F0' :
                        check.status === 'good' ? '#F0F9F4' :
                        '#FAFAF8',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{check.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-text">{check.name}</div>
                        <div className="text-xs text-textSecondary">{check.message}</div>
                      </div>
                    </div>
                    {check.status === 'good' && (
                      <span className="text-green-600">✓</span>
                    )}
                    {check.status === 'warning' && (
                      <span className="text-yellow-600">!</span>
                    )}
                    {check.status === 'error' && (
                      <span className="text-red-600">✕</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offline Map Action */}
          {trailId && !offlineMapAvailable && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF8F0', border: '1px solid #F4A34020' }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text mb-1">Offline map not downloaded</div>
                  <div className="text-xs text-textSecondary">
                    Download the trail map to navigate even when offline. Recommended for areas with limited cell service.
                  </div>
                </div>
              </div>
              <button
                onClick={handleDownloadMap}
                disabled={downloadingMap}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: '#4C7EF3', color: 'white' }}
              >
                {downloadingMap ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Downloading...
                  </span>
                ) : (
                  '📥 Download offline map'
                )}
              </button>
            </div>
          )}

          {/* Weather Alert */}
          {weather?.success && (weather.temperature < 32 || weather.temperature > 95) && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEF3F2', border: '1px solid #FEE2E2' }}>
              <div className="flex items-start gap-3">
                <span className="text-xl">🌡️</span>
                <div>
                  <div className="text-sm font-medium text-text mb-1">Extreme weather conditions</div>
                  <div className="text-xs text-textSecondary">
                    {weather.temperature < 32 
                      ? 'Temperature is below freezing. Bring extra layers and watch for ice.'
                      : 'Temperature is very high. Bring extra water and take frequent breaks.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t" style={{ borderColor: '#E8E8E3' }}>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors"
              style={{ border: '1px solid #E8E8E3', color: '#5F6F6A' }}
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#4F8A6B',
                backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Starting...
                </span>
              ) : (
                <>🟢 Start hike</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
