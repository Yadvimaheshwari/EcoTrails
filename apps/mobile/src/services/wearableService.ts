import { useWearableStore } from '../store/useWearableStore';
import { useHikeStore } from '../store/useHikeStore';
import { api } from '../config/api';

interface WearableData {
  timestamp: Date;
  heartRate?: number;
  cadence?: number;
  hrv?: number;
  effort?: number;
  steps?: number;
  calories?: number;
}

export class WearableService {
  private static instance: WearableService;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): WearableService {
    if (!WearableService.instance) {
      WearableService.instance = new WearableService();
    }
    return WearableService.instance;
  }

  async startCollection() {
    const { getConnectedDevices } = useWearableStore.getState();
    const { addSensorBatch, currentHike } = useHikeStore.getState();
    const devices = getConnectedDevices();

    const hikeId = currentHike.id;
    if (devices.length === 0 || !hikeId) {
      return;
    }

    // Collect data every 10 seconds
    this.intervalId = setInterval(async () => {
      const data = await this.collectWearableData(devices);
      if (data.length > 0) {
        // Add to local store
        addSensorBatch(data);
        
        // Sync to backend if online
        try {
          await this.syncToBackend(hikeId, data);
        } catch (error) {
          console.error('Failed to sync wearable data:', error);
          // Data is already in local store, will sync later
        }
      }
    }, 10000);
  }

  private async syncToBackend(hikeId: string, sensors: any[]) {
    const batch = sensors.map((s) => ({
      timestamp: s.timestamp.toISOString(),
      device: s.data.device,
      heartRate: s.data.heartRate,
      cadence: s.data.cadence,
      hrv: s.data.hrv,
      effort: s.data.effort,
      steps: s.data.steps,
      calories: s.data.calories,
      location: s.location,
    }));

    await api.post(`/api/v1/hikes/${hikeId}/wearable-data`, { batch });
  }

  stopCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async collectWearableData(devices: string[]): Promise<Array<{
    timestamp: Date;
    type: string;
    data: any;
    location?: { lat: number; lng: number };
    confidence: string;
  }>> {
    const sensors: Array<{
      timestamp: Date;
      type: string;
      data: any;
      location?: { lat: number; lng: number };
      confidence: string;
    }> = [];

    for (const deviceType of devices) {
      try {
        const data = await this.fetchDeviceData(deviceType);
        if (data) {
          sensors.push({
            timestamp: data.timestamp,
            type: 'wearable',
            data: {
              device: deviceType,
              heartRate: data.heartRate,
              cadence: data.cadence,
              hrv: data.hrv,
              effort: data.effort,
              steps: data.steps,
              calories: data.calories,
            },
            confidence: 'High',
          });
        }
      } catch (error) {
        console.error(`Failed to collect data from ${deviceType}:`, error);
      }
    }

    return sensors;
  }

  private async fetchDeviceData(deviceType: string): Promise<WearableData | null> {
    const { appleWatch, garmin, fitbit } = useWearableStore.getState();

    switch (deviceType) {
      case 'apple_watch':
        if (appleWatch.connected) {
          return await this.fetchAppleWatchData();
        }
        break;
      case 'garmin':
        if (garmin.connected) {
          return await this.fetchGarminData();
        }
        break;
      case 'fitbit':
        if (fitbit.connected) {
          return await this.fetchFitbitData();
        }
        break;
    }

    return null;
  }

  private async fetchAppleWatchData(): Promise<WearableData> {
    // In real implementation, this would use HealthKit APIs
    // For now, return sample data
    return {
      timestamp: new Date(),
      heartRate: Math.floor(Math.random() * 40) + 60,
      cadence: Math.floor(Math.random() * 20) + 140,
      hrv: Math.floor(Math.random() * 30) + 40,
      effort: Math.floor(Math.random() * 50) + 50,
    };
  }

  private async fetchGarminData(): Promise<WearableData> {
    // Stub implementation - would call Garmin API
    return {
      timestamp: new Date(),
      heartRate: Math.floor(Math.random() * 40) + 60,
      cadence: Math.floor(Math.random() * 20) + 140,
      steps: Math.floor(Math.random() * 100) + 1000,
      calories: Math.floor(Math.random() * 50) + 200,
    };
  }

  private async fetchFitbitData(): Promise<WearableData> {
    // Stub implementation - would call Fitbit API
    return {
      timestamp: new Date(),
      heartRate: Math.floor(Math.random() * 40) + 60,
      steps: Math.floor(Math.random() * 100) + 1000,
      calories: Math.floor(Math.random() * 50) + 200,
    };
  }
}
