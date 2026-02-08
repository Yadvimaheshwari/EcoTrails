import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    trailLocation?: { lat: number; lng: number } | null;
    trailBounds?: { north: number; south: number; east: number; west: number } | null;
    startTimeMs: number | null;
    status: 'idle' | 'active' | 'paused' | 'completed';
    routePoints: RoutePoint[];
    sensorBatches: SensorData[][];
  };
  startHike: (
    trailId: string | null,
    placeId: string,
    name?: string,
    trailLocation?: { lat: number; lng: number } | null,
    trailBounds?: { north: number; south: number; east: number; west: number } | null
  ) => Promise<void>;
  addRoutePoint: (point: RoutePoint) => void;
  addSensorBatch: (sensors: SensorData[]) => void;
  pauseHike: () => void;
  resumeHike: () => void;
  endHike: () => Promise<void>;
  clearHike: () => void;
}

export const useHikeStore = create<HikeState>()(
  persist(
    (set, get) => ({
      currentHike: {
        id: null,
        trailId: null,
        placeId: '',
        name: null,
        trailLocation: null,
        trailBounds: null,
        startTimeMs: null,
        status: 'idle',
        routePoints: [],
        sensorBatches: [],
      },

      startHike: async (trailId, placeId, name, trailLocation, trailBounds) => {
        const hikeId = `hike_${Date.now()}`;
        const startTimeMs = Date.now();

        set({
          currentHike: {
            id: hikeId,
            trailId,
            placeId,
            name: name || null,
            trailLocation: trailLocation || null,
            trailBounds: trailBounds || null,
            startTimeMs,
            status: 'active',
            routePoints: [],
            sensorBatches: [],
          },
        });

        await dbService.addHikeToQueue({
          hikeId,
          trailId,
          placeId,
          name: name || null,
          startTime: new Date(startTimeMs).toISOString(),
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
          dbService.addSensorBatch(currentHike.id!, sensors);
        }
      },

      pauseHike: () => {
        const { currentHike } = get();
        if (currentHike.status === 'active') {
          set({ currentHike: { ...currentHike, status: 'paused' } });
        }
      },

      resumeHike: () => {
        const { currentHike } = get();
        if (currentHike.status === 'paused') {
          set({ currentHike: { ...currentHike, status: 'active' } });
        }
      },

      endHike: async () => {
        const { currentHike } = get();
        if (currentHike.id) {
          set({ currentHike: { ...currentHike, status: 'completed' } });
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
            trailLocation: null,
            trailBounds: null,
            startTimeMs: null,
            status: 'idle',
            routePoints: [],
            sensorBatches: [],
          },
        });
      },
    }),
    {
      name: 'hike_store_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentHike: state.currentHike,
      }),
    }
  )
);
