/**
 * EcoDroid Device Connection Service
 * Handles WebSocket communication with EcoDroid Mini hardware
 */
// React Native has WebSocket built-in, no import needed
import { API_BASE_URL, getWebSocketUrl } from '../config/api';

export interface EcoDroidDevice {
  deviceId: string;
  status: 'connected' | 'disconnected' | 'streaming';
  sensors: {
    camera: { resolution: string; fps: number };
    microphone: { sampleRate: number };
    gps: { accuracy: number; coordinates: [number, number] };
    imu: { acceleration: number[]; gyro: number[] };
    temperature?: number;
    airQuality?: number;
  };
}

export interface StreamData {
  type: 'video_frame' | 'audio_chunk' | 'telemetry' | 'heartbeat';
  timestamp: number;
  data?: any;
  frame?: string;  // base64
  audio?: string;  // base64
  gps?: { lat: number; lng: number; altitude: number; accuracy: number };
}

class EcoDroidService {
  private ws: any = null; // WebSocket type from React Native
  private deviceId: string | null = null;
  private sessionId: string | null = null;
  private apiBaseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onObservationCallback?: (observation: any) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(apiBaseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = getWebSocketUrl(apiBaseUrl);
  }

  /**
   * Connect to EcoDroid device via WebSocket
   */
  async connect(deviceId: string, sessionId: string): Promise<void> {
    this.deviceId = deviceId;
    this.sessionId = sessionId;

    const wsUrl = `${this.apiBaseUrl}/ws/ecodroid/${deviceId}?session_id=${sessionId}`;

    return new Promise((resolve, reject) => {
      try {
        // React Native has WebSocket available globally
        // Use the global WebSocket constructor
        const WebSocketConstructor = (global as any).WebSocket || WebSocket;
        this.ws = new WebSocketConstructor(wsUrl);

        this.ws.onopen = () => {
          console.log('EcoDroid connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event: any) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error: any) => {
          console.error('WebSocket error:', error);
          if (this.onErrorCallback) {
            this.onErrorCallback(error as Error);
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('EcoDroid disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send video frame to backend
   */
  sendVideoFrame(frameBase64: string, gps?: { lat: number; lng: number; altitude: number }): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      console.warn('WebSocket not connected');
      return;
    }

    const message: StreamData = {
      type: 'video_frame',
      timestamp: Date.now(),
      frame: frameBase64,
      gps,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send audio chunk to backend
   */
  sendAudioChunk(audioBase64: string, gps?: { lat: number; lng: number; altitude: number }): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      console.warn('WebSocket not connected');
      return;
    }

    const message: StreamData = {
      type: 'audio_chunk',
      timestamp: Date.now(),
      audio: audioBase64,
      gps,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send sensor telemetry
   */
  sendTelemetry(telemetry: {
    heart_rate?: number;
    altitude?: number;
    pressure?: number;
    lat?: number;
    lng?: number;
    imu?: { acceleration: number[]; gyro: number[] };
    temperature?: number;
    airQuality?: number;
  }): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      console.warn('WebSocket not connected');
      return;
    }

    const message: StreamData = {
      type: 'telemetry',
      timestamp: Date.now(),
      data: telemetry,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send heartbeat
   */
  sendHeartbeat(): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      return;
    }

    const message: StreamData = {
      type: 'heartbeat',
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * End session
   */
  endSession(): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      return;
    }

    const message: StreamData = {
      type: 'session_end',
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
    this.disconnect();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    if (data.type === 'observation' && this.onObservationCallback) {
      this.onObservationCallback(data.data);
    } else if (data.type === 'wearable_alert') {
      // Forward to wearable service
      // This would trigger a notification on the watch
    }
  }

  /**
   * Set callback for real-time observations
   */
  onObservation(callback: (observation: any) => void): void {
    this.onObservationCallback = callback;
  }

  /**
   * Set error callback
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.deviceId && this.sessionId) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
        this.connect(this.deviceId!, this.sessionId!);
      }, 2000 * this.reconnectAttempts);
    }
  }

  /**
   * Disconnect from device
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.deviceId = null;
    this.sessionId = null;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1; // WebSocket.OPEN = 1
  }
}

export default new EcoDroidService();
