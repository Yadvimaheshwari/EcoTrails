/**
 * Hike State Machine
 * Manages the lifecycle of a hike session with proper state transitions
 */

export type HikeState = 'PLANNING' | 'READY_TO_START' | 'ACTIVE_HIKE' | 'PAUSED' | 'ENDED';

export interface HikeSessionData {
  hikeId: string | null;
  trailId?: string;
  trailName?: string;
  placeId?: string;
  placeName?: string;
  state: HikeState;
  startTime: string | null;
  endTime: string | null;
  pausedAt: string | null;
  pausedTimeTotal: number; // milliseconds
  lastKnownLocation: { lat: number; lng: number } | null;
  offlineMode: boolean;
  queuedEvents: HikeEvent[];
  distance: number; // miles
  elevationGain: number; // feet
}

export interface HikeEvent {
  id: string;
  type: 'location' | 'discovery' | 'note' | 'photo' | 'voice';
  timestamp: string;
  data: any;
  synced: boolean;
}

export interface SystemCheck {
  name: string;
  status: 'good' | 'warning' | 'error' | 'unknown';
  message: string;
  icon: string;
}

const INITIAL_SESSION: HikeSessionData = {
  hikeId: null,
  state: 'PLANNING',
  startTime: null,
  endTime: null,
  pausedAt: null,
  pausedTimeTotal: 0,
  lastKnownLocation: null,
  offlineMode: false,
  queuedEvents: [],
  distance: 0,
  elevationGain: 0,
};

export class HikeStateMachine {
  private session: HikeSessionData;
  private listeners: Array<(session: HikeSessionData) => void> = [];

  constructor(initialSession?: Partial<HikeSessionData>) {
    this.session = { ...INITIAL_SESSION, ...initialSession };
  }

  getSession(): HikeSessionData {
    return { ...this.session };
  }

  setState(newState: HikeState) {
    const validTransitions: Record<HikeState, HikeState[]> = {
      PLANNING: ['READY_TO_START'],
      READY_TO_START: ['PLANNING', 'ACTIVE_HIKE'],
      ACTIVE_HIKE: ['PAUSED', 'ENDED'],
      PAUSED: ['ACTIVE_HIKE', 'ENDED'],
      ENDED: ['PLANNING'],
    };

    const allowed = validTransitions[this.session.state];
    if (!allowed.includes(newState)) {
      console.warn(
        `Invalid state transition: ${this.session.state} -> ${newState}`
      );
      return false;
    }

    this.session.state = newState;
    this.notifyListeners();
    return true;
  }

  startHike(hikeId: string) {
    if (this.session.state !== 'READY_TO_START' && this.session.state !== 'PLANNING') {
      console.warn('Cannot start hike from current state:', this.session.state);
      return false;
    }

    this.session.hikeId = hikeId;
    this.session.startTime = new Date().toISOString();
    this.session.state = 'ACTIVE_HIKE';
    this.notifyListeners();
    return true;
  }

  pauseHike() {
    if (this.session.state !== 'ACTIVE_HIKE') {
      return false;
    }

    this.session.pausedAt = new Date().toISOString();
    this.session.state = 'PAUSED';
    this.notifyListeners();
    return true;
  }

  resumeHike() {
    if (this.session.state !== 'PAUSED') {
      return false;
    }

    if (this.session.pausedAt) {
      const pauseDuration = Date.now() - new Date(this.session.pausedAt).getTime();
      this.session.pausedTimeTotal += pauseDuration;
      this.session.pausedAt = null;
    }

    this.session.state = 'ACTIVE_HIKE';
    this.notifyListeners();
    return true;
  }

  endHike() {
    if (this.session.state !== 'ACTIVE_HIKE' && this.session.state !== 'PAUSED') {
      return false;
    }

    this.session.endTime = new Date().toISOString();
    this.session.state = 'ENDED';
    this.notifyListeners();
    return true;
  }

  updateLocation(location: { lat: number; lng: number }) {
    this.session.lastKnownLocation = location;
    this.addEvent({
      id: `loc_${Date.now()}`,
      type: 'location',
      timestamp: new Date().toISOString(),
      data: location,
      synced: false,
    });
    this.notifyListeners();
  }

  updateDistance(miles: number) {
    this.session.distance = miles;
    this.notifyListeners();
  }

  updateElevationGain(feet: number) {
    this.session.elevationGain = feet;
    this.notifyListeners();
  }

  setOfflineMode(offline: boolean) {
    this.session.offlineMode = offline;
    this.notifyListeners();
  }

  addEvent(event: HikeEvent) {
    this.session.queuedEvents.push(event);
    this.notifyListeners();
  }

  markEventSynced(eventId: string) {
    const event = this.session.queuedEvents.find((e) => e.id === eventId);
    if (event) {
      event.synced = true;
      this.notifyListeners();
    }
  }

  getElapsedTime(): number {
    if (!this.session.startTime) return 0;

    const now = Date.now();
    const start = new Date(this.session.startTime).getTime();
    const elapsed = now - start - this.session.pausedTimeTotal;

    // If currently paused, subtract the current pause duration
    if (this.session.state === 'PAUSED' && this.session.pausedAt) {
      const pauseDuration = now - new Date(this.session.pausedAt).getTime();
      return Math.max(0, elapsed - pauseDuration);
    }

    return Math.max(0, elapsed);
  }

  subscribe(listener: (session: HikeSessionData) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.session));
  }

  reset() {
    this.session = { ...INITIAL_SESSION };
    this.notifyListeners();
  }
}

/**
 * Perform system checks before starting a hike
 */
export async function performSystemChecks(
  weather?: any,
  offlineMapAvailable?: boolean
): Promise<SystemCheck[]> {
  const checks: SystemCheck[] = [];

  // GPS Check
  if ('geolocation' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'granted') {
        checks.push({
          name: 'GPS/Location',
          status: 'good',
          message: 'Location access granted',
          icon: '📍',
        });
      } else if (permission.state === 'prompt') {
        checks.push({
          name: 'GPS/Location',
          status: 'warning',
          message: 'Location permission needed',
          icon: '📍',
        });
      } else {
        checks.push({
          name: 'GPS/Location',
          status: 'error',
          message: 'Location access denied',
          icon: '❌',
        });
      }
    } catch {
      checks.push({
        name: 'GPS/Location',
        status: 'good',
        message: 'Location available',
        icon: '📍',
      });
    }
  } else {
    checks.push({
      name: 'GPS/Location',
      status: 'error',
      message: 'Geolocation not supported',
      icon: '❌',
    });
  }

  // Offline Map Check
  checks.push({
    name: 'Offline Map',
    status: offlineMapAvailable ? 'good' : 'warning',
    message: offlineMapAvailable ? 'Map downloaded' : 'Not downloaded',
    icon: '🗺️',
  });

  // Battery Check
  if ('getBattery' in navigator) {
    try {
      const battery: any = await (navigator as any).getBattery();
      const level = Math.round(battery.level * 100);
      checks.push({
        name: 'Battery',
        status: level > 20 ? 'good' : level > 10 ? 'warning' : 'error',
        message: `${level}%${battery.charging ? ' (charging)' : ''}`,
        icon: '🔋',
      });
    } catch {
      checks.push({
        name: 'Battery',
        status: 'unknown',
        message: 'Unable to detect',
        icon: '🔋',
      });
    }
  } else {
    checks.push({
      name: 'Battery',
      status: 'unknown',
      message: 'Unable to detect',
      icon: '🔋',
    });
  }

  // Weather Check
  if (weather?.success) {
    const temp = weather.temperature;
    const hasAlerts = weather.alerts && weather.alerts.length > 0;
    
    if (hasAlerts) {
      checks.push({
        name: 'Weather',
        status: 'warning',
        message: `${Math.round(temp)}°F · ${weather.alerts.length} alert(s)`,
        icon: '⚠️',
      });
    } else if (temp < 32 || temp > 95) {
      checks.push({
        name: 'Weather',
        status: 'warning',
        message: `${Math.round(temp)}°F · Extreme conditions`,
        icon: '🌡️',
      });
    } else {
      checks.push({
        name: 'Weather',
        status: 'good',
        message: `${Math.round(temp)}°F · ${weather.description}`,
        icon: '☀️',
      });
    }
  } else {
    checks.push({
      name: 'Weather',
      status: 'unknown',
      message: 'Unable to load',
      icon: '🌡️',
    });
  }

  return checks;
}
