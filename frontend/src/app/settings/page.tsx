'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserDevices, removeDevice } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineDownloads, setOfflineDownloads] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadDevices();
    }
  }, [user, isLoading, router]);

  const loadDevices = async () => {
    try {
      const response = await getUserDevices();
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await removeDevice(deviceId);
      await loadDevices();
    } catch (error) {
      console.error('Failed to remove device:', error);
    }
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-4">Settings</h1>
      <p className="text-xl text-textSecondary mb-12">Manage your account and devices</p>

      <div className="space-y-8">
        <section className="card">
          <h2 className="text-2xl font-semibold mb-6">Integrations</h2>
          <p className="text-sm text-textSecondary mb-4">
            Connect your fitness devices and apps to sync your hiking data
          </p>
          <button
            onClick={() => router.push('/settings/integrations')}
            className="text-primary hover:text-primaryDark font-medium"
          >
            Manage Integrations →
          </button>
        </section>

        <section className="card">
          <h2 className="text-2xl font-semibold mb-6">Devices</h2>
          {loading ? (
            <p className="text-textSecondary">Loading...</p>
          ) : devices.length === 0 ? (
            <p className="text-textSecondary">No devices connected</p>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border border-border rounded-xl"
                >
                  <div>
                    <h3 className="font-semibold">{device.name}</h3>
                    <p className="text-sm text-textSecondary">{device.type}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveDevice(device.id)}
                    className="text-error hover:text-error/80 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-2xl font-semibold mb-6">Preferences</h2>
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <h3 className="font-semibold">Offline Downloads</h3>
              <p className="text-sm text-textSecondary">Download maps for offline use</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={offlineDownloads}
                onChange={(e) => setOfflineDownloads(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-2xl font-semibold mb-6">Account</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Email</h3>
              <p className="text-textSecondary">{user?.email}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Privacy</h3>
              <p className="text-sm text-textSecondary mb-4">
                Manage your data and privacy settings
              </p>
              <button className="text-primary hover:text-primaryDark font-medium">
                View Privacy Settings →
              </button>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Billing</h3>
              <p className="text-sm text-textSecondary mb-4">
                Free / Premium subscription
              </p>
              <button className="text-primary hover:text-primaryDark font-medium">
                Manage Subscription →
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <button
            onClick={logout}
            className="w-full py-3 px-6 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}
