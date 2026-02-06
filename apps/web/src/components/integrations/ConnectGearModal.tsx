'use client';

import { useState } from 'react';
import { PROVIDER_METADATA, IntegrationProvider } from '@/lib/integrations/types';
import { setIntegrationPromptDismissed } from '@/lib/integrations/storage';
import { X } from 'lucide-react';

interface ConnectGearModalProps {
  onClose: () => void;
  onConnect: (provider: IntegrationProvider) => Promise<void>;
}

export function ConnectGearModal({ onClose, onConnect }: ConnectGearModalProps) {
  const [connecting, setConnecting] = useState<IntegrationProvider | null>(null);

  const handleConnect = async (provider: IntegrationProvider) => {
    setConnecting(provider);
    try {
      await onConnect(provider);
      // Modal will be closed by the OAuth redirect or parent component
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnecting(null);
    }
  };

  const handleSkip = () => {
    setIntegrationPromptDismissed();
    onClose();
  };

  const providers: IntegrationProvider[] = ['apple_health', 'garmin', 'strava'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-2xl">
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
          <div className="text-center mb-2">
            <div className="text-5xl mb-4">⌚</div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Connect your gear</h2>
            <p className="text-lg text-slate-600">
              Sync your fitness data to enrich your hiking experience
            </p>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="p-6 space-y-4">
          {providers.map((providerId) => {
            const provider = PROVIDER_METADATA[providerId];
            const isConnecting = connecting === providerId;
            
            return (
              <div
                key={providerId}
                className="border-2 border-slate-200 rounded-xl p-5 hover:border-orange-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{provider.logo}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">{provider.description}</p>
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
                    {provider.requiresMobile ? (
                      <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                        📱 Available in iOS app
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(providerId)}
                        disabled={isConnecting}
                        className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConnecting ? (
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-2xl">
          <div className="text-center mb-4">
            <p className="text-sm text-slate-600 mb-2">
              🔒 <span className="font-medium">Your privacy matters</span>
            </p>
            <p className="text-xs text-slate-500">
              EcoTrails only reads the data you allow. You can disconnect anytime from Settings.
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="w-full px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Connect later
          </button>
        </div>
      </div>
    </div>
  );
}
