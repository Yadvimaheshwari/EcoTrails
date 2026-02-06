import { create } from 'zustand';
import { dbService } from '../services/offlineQueue';

interface RoutePoint {
  sequence: number;
  timestamp: Date;
  location: { lat: number; lng: number; altitude?: number };
  metadata?: any;
}

interface SensorData {
  timestamp: Date;
  type: string;
  data: any;
  location?: { lat: number; lng: number };
  confidence?: string;
}

interface HikeState {
  currentHike: {
    id: string | null;
    trailId: string | null;
    placeId: string;
    name: string | null;
    startTime: Date | null;
    status: 'idle' | 'active' | 'paused' | 'completed';
    routePoints: RoutePoint[];
    sensorBatches: SensorData[][];
  };
  startHike: (trailId: string | null, placeId: string, name?: string) => Promise<void>;
  addRoutePoint: (point: RoutePoint) => void;
  addSensorBatch: (sensors: SensorData[]) => void;
  pauseHike: () => void;
  resumeHike: () => void;
  endHike: () => Promise<void>;
  clearHike: () => void;
}

export const useHikeStore = create<HikeState>((set, get) => ({
  currentHike: {
    id: null,
    trailId: null,
    placeId: '',
    name: null,
    startTime: null,
    status: 'idle',
    routePoints: [],
    sensorBatches: [],
  },
  
  startHike: async (trailId, placeId, name) => {
    const hikeId = `hike_${Date.now()}`;
    const startTime = new Date();
    
    set({
      currentHike: {
        id: hikeId,
        trailId,
        placeId,
        name: name || null,
        startTime,
        status: 'active',
        routePoints: [],
        sensorBatches: [],
      },
    });
    
    // Save to offline queue
    await dbService.addHikeToQueue({
      hikeId,
      trailId,
      placeId,
      name,
      startTime: startTime.toISOString(),
      status: 'active',
    });
  },
  
  addRoutePoint: (point) => {
    const { currentHike } = get();
    if (currentHike.status === 'active') {
      const updated = {
        ...currentHike,
        routePoints: [...currentHike.routePoints, point],
      };
      set({ currentHike: updated });
      
      // Save to offline queue
      dbService.addRoutePoint(currentHike.id!, point);
    }
  },
  
  addSensorBatch: (sensors) => {
    const { currentHike } = get();
    if (currentHike.status === 'active') {
      const updated = {
        ...currentHike,
        sensorBatches: [...currentHike.sensorBatches, sensors],
      };
      set({ currentHike: updated });
      
      // Save to offline queue
      dbService.addSensorBatch(currentHike.id!, sensors);
    }
  },
  
  pauseHike: () => {
    const { currentHike } = get();
    if (currentHike.status === 'active') {
      set({
        currentHike: {
          ...currentHike,
          status: 'paused',
        },
      });
    }
  },
  
  resumeHike: () => {
    const { currentHike } = get();
    if (currentHike.status === 'paused') {
      set({
        currentHike: {
          ...currentHike,
          status: 'active',
        },
      });
    }
  },
  
  endHike: async () => {
    const { currentHike } = get();
    if (currentHike.id) {
      set({
        currentHike: {
          ...currentHike,
          status: 'completed',
        },
      });
      
      // Mark for sync in offline queue
      await dbService.markHikeForSync(currentHike.id);
    }
  },
  
  clearHike: () => {
    set({
      currentHike: {
        id: null,
        trailId: null,
        placeId: '',
        name: null,
        startTime: null,
        status: 'idle',
        routePoints: [],
        sensorBatches: [],
      },
    });
  },
}));
