'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PROVIDER_METADATA,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationPreferences,
} from '@/lib/integrations/types';
import {
  getIntegrationPreferences,
  updateProviderPreference,
} from '@/lib/integrations/storage';
import { ChevronLeft, Check, X, RefreshCw, Shield } from 'lucide-react';

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [preferences, setPreferences] = useState<Record<IntegrationProvider, IntegrationPreferences>>({
    apple_health: { importLast30Days: true, autoSyncAfterHike: true },
    garmin: { importLast30Days: true, autoSyncAfterHike: true },
    strava: { importLast30Days: true, autoSyncAfterHike: false },
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<IntegrationProvider | null>(null);
  const [disconnecting, setDisconnecting] = useState<IntegrationProvider | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check for OAuth callback status
  useEffect(() => {
    const success = searchParams?.get('integration_success');
    const error = searchParams?.get('integration_error');

    if (success) {
      setToast({ message: `${success} connected successfully!`, type: 'success' });
      // Reload status after successful connection
      loadStatus();
      // Clean up URL
      router.replace('/settings/integrations');
    } else if (error) {
      setToast({ message: `Failed to connect: ${error}`, type: 'error' });
      router.replace('/settings/integrations');
    }
  }, [searchParams, router]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load integration status
  const loadStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status');
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses || []);
        setPreferences(data.preferences || preferences);
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async (provider: IntegrationProvider) => {
    const metadata = PROVIDER_METADATA[provider];
    
    if (metadata.requiresMobile) {
      setToast({ message: 'Apple Health requires the iOS mobile app', type: 'error' });
      return;
    }

    setConnecting(provider);
    try {
      const response = await fetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to OAuth provider
        window.location.href = data.redirectUrl;
      } else {
        setToast({ message: data.error || 'Failed to connect', type: 'error' });
        setConnecting(null);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setToast({ message: 'Connection failed', type: 'error' });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: IntegrationProvider) => {
    if (!confirm(`Disconnect ${PROVIDER_METADATA[provider].name}?`)) {
      return;
    }

    setDisconnecting(provider);
    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setToast({ message: `${PROVIDER_METADATA[provider].name} disconnected`, type: 'success' });
        loadStatus();
      } else {
        setToast({ message: data.error || 'Failed to disconnect', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setToast({ message: 'Disconnection failed', type: 'error' });
    } finally {
      setDisconnecting(null);
    }
  };

  const handlePreferenceToggle = (
    provider: IntegrationProvider,
    key: 'importLast30Days' | 'autoSyncAfterHike'
  ) => {
    const newValue = !preferences[provider][key];
    setPreferences((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [key]: newValue,
      },
    }));
    updateProviderPreference(provider, key, newValue);
  };

  const getStatusForProvider = (provider: IntegrationProvider): IntegrationStatus => {
    return (
      statuses.find((s) => s.provider === provider) || {
        provider,
        connected: false,
      }
    );
  };

  const providers: IntegrationProvider[] = ['apple_health', 'garmin', 'strava'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-80"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to settings"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Integrations</h1>
              <p className="text-sm text-slate-600 mt-1">Connect your fitness devices and apps</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((providerId) => {
              const provider = PROVIDER_METADATA[providerId];
              const status = getStatusForProvider(providerId);
              const isConnecting = connecting === providerId;
              const isDisconnecting = disconnecting === providerId;
              const prefs = preferences[providerId];

              return (
                <div key={providerId} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="text-5xl flex-shrink-0">{provider.logo}</div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{provider.name}</h3>
                          {status.connected && status.lastSync && (
                            <p className="text-xs text-slate-500 mt-1">
                              Last synced: {new Date(status.lastSync).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {status.connected ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Connected
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                              Not connected
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 mb-4">{provider.description}</p>

                      {/* Data Types */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {provider.dataTypes.map((type) => (
                          <span
                            key={type}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                          >
                            {type}
                          </span>
                        ))}
                      </div>

                      {/* Action Button */}
                      {provider.requiresMobile ? (
                        <div className="px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
                          📱 Connect via iOS app to sync Apple Health data
                        </div>
                      ) : status.connected ? (
                        <>
                          {/* Preferences */}
                          <div className="space-y-3 mb-4 p-4 bg-slate-50 rounded-lg">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  Import last 30 days
                                </p>
                                <p className="text-xs text-slate-500">
                                  Sync historical activities when connecting
                                </p>
                              </div>
                              <button
                                onClick={() => handlePreferenceToggle(providerId, 'importLast30Days')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  prefs.importLast30Days ? 'bg-orange-600' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    prefs.importLast30Days ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </label>

                            <label className="flex items-center justify-between cursor-pointer">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  Auto-sync after each hike
                                </p>
                                <p className="text-xs text-slate-500">
                                  Automatically fetch new data after completing hikes
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handlePreferenceToggle(providerId, 'autoSyncAfterHike')
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  prefs.autoSyncAfterHike ? 'bg-orange-600' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    prefs.autoSyncAfterHike ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </label>
                          </div>

                          {/* Disconnect Button */}
                          <button
                            onClick={() => handleDisconnect(providerId)}
                            disabled={isDisconnecting}
                            className="px-6 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDisconnecting ? (
                              <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Disconnecting...
                              </span>
                            ) : (
                              'Disconnect'
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(providerId)}
                          disabled={isConnecting}
                          className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isConnecting ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Connecting...
                            </span>
                          ) : (
                            `Connect ${provider.name}`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Privacy Note */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-6">
          <div className="flex gap-3">
            <Shield className="w-6 h-6 text-purple-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Your privacy matters</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                EcoTrails only reads the data you explicitly allow. We never share your fitness data
                with third parties, and you can disconnect any integration at any time. All synced
                data is encrypted and stored securely.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
