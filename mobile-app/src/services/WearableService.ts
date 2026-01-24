/**
 * Wearable Device Integration Service
 * Handles communication with Apple Watch and Wear OS devices
 */
import { Platform } from 'react-native';

// Platform-specific imports
let WatchConnectivity: any = null;
let WearableDataLayer: any = null;

if (Platform.OS === 'ios') {
  try {
    WatchConnectivity = require('react-native-watch-connectivity').default;
  } catch (e) {
    console.warn('WatchConnectivity not available');
  }
} else if (Platform.OS === 'android') {
  try {
    WearableDataLayer = require('react-native-wear').default;
  } catch (e) {
    console.warn('WearableDataLayer not available');
  }
}

export interface WearableAlert {
  type: 'safety' | 'environmental' | 'confirmation' | 'status';
  message: string;
  vibration?: 'gentle' | 'strong' | 'urgent';
  action?: 'tap_to_confirm' | 'swipe_to_dismiss';
  priority?: 'low' | 'medium' | 'high';
}

class WearableService {
  private isWatchConnected = false;
  private isWearOSConnected = false;
  private onInteractionCallback?: (action: string, data?: any) => void;

  /**
   * Initialize wearable connection
   */
  async initialize(): Promise<void> {
    if (Platform.OS === 'ios' && WatchConnectivity) {
      try {
        const isSupported = await WatchConnectivity.isSupported();
        if (isSupported) {
          WatchConnectivity.addListener('message', (message: any) => {
            this.handleWatchMessage(message);
          });
          this.isWatchConnected = await WatchConnectivity.isPaired();
        }
      } catch (error) {
        console.error('Error initializing Apple Watch:', error);
      }
    } else if (Platform.OS === 'android' && WearableDataLayer) {
      try {
        await WearableDataLayer.initialize();
        this.isWearOSConnected = true;
      } catch (error) {
        console.error('Error initializing Wear OS:', error);
      }
    }
  }

  /**
   * Send alert to wearable device
   */
  async sendAlert(alert: WearableAlert): Promise<boolean> {
    if (Platform.OS === 'ios' && WatchConnectivity && this.isWatchConnected) {
      try {
        await WatchConnectivity.sendMessage({
          type: 'alert',
          ...alert,
        });
        return true;
      } catch (error) {
        console.error('Error sending to Apple Watch:', error);
        return false;
      }
    } else if (Platform.OS === 'android' && WearableDataLayer && this.isWearOSConnected) {
      try {
        await WearableDataLayer.sendData({
          path: '/ecoatlas/alert',
          data: alert,
        });
        return true;
      } catch (error) {
        console.error('Error sending to Wear OS:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Send vibration pattern
   */
  async sendVibration(pattern: 'gentle' | 'strong' | 'urgent'): Promise<void> {
    const vibrationPattern = {
      gentle: [100, 50, 100],
      strong: [200, 100, 200, 100, 200],
      urgent: [300, 100, 300, 100, 300, 100, 300],
    };

    if (Platform.OS === 'ios' && WatchConnectivity) {
      await WatchConnectivity.sendMessage({
        type: 'vibration',
        pattern: vibrationPattern[pattern],
      });
    } else if (Platform.OS === 'android' && WearableDataLayer) {
      await WearableDataLayer.sendData({
        path: '/ecoatlas/vibration',
        data: { pattern: vibrationPattern[pattern] },
      });
    }
  }

  /**
   * Send status update (battery, connection, etc.)
   */
  async sendStatus(status: {
    battery?: number;
    connection?: string;
    sessionActive?: boolean;
  }): Promise<void> {
    if (Platform.OS === 'ios' && WatchConnectivity) {
      await WatchConnectivity.sendMessage({
        type: 'status',
        ...status,
      });
    } else if (Platform.OS === 'android' && WearableDataLayer) {
      await WearableDataLayer.sendData({
        path: '/ecoatlas/status',
        data: status,
      });
    }
  }

  /**
   * Handle message from wearable
   */
  private handleWatchMessage(message: any): void {
    if (message.type === 'interaction' && this.onInteractionCallback) {
      this.onInteractionCallback(message.action, message.data);
    }
  }

  /**
   * Set callback for wearable interactions
   */
  onInteraction(callback: (action: string, data?: any) => void): void {
    this.onInteractionCallback = callback;
  }

  /**
   * Check if wearable is connected
   */
  isConnected(): boolean {
    return this.isWatchConnected || this.isWearOSConnected;
  }

  /**
   * Get device type
   */
  getDeviceType(): 'apple_watch' | 'wear_os' | 'none' {
    if (Platform.OS === 'ios' && this.isWatchConnected) {
      return 'apple_watch';
    } else if (Platform.OS === 'android' && this.isWearOSConnected) {
      return 'wear_os';
    }
    return 'none';
  }
}

export default new WearableService();
