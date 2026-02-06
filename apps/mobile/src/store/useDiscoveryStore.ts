/**
 * Discovery Store (Mobile)
 * Zustand store for managing discoveries, badges, and gamification state
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Discovery, CapturedDiscovery } from '../types/discovery';
import { Badge, BadgeAward } from '../types/badge';

interface DiscoveryState {
  // User's captured discoveries (persisted)
  allCapturedDiscoveries: CapturedDiscovery[];
  
  // User's badges (persisted)
  allBadges: Badge[];
  
  // Current session discoveries (not persisted, loaded fresh each hike)
  currentHikeDiscoveries: Discovery[];
  currentHikeCaptured: CapturedDiscovery[];
  currentHikeBadges: Badge[];
  
  // Stats
  totalDiscoveries: number;
  totalBadges: number;
  
  // Actions
  loadPersistedData: () => Promise<void>;
  persistData: () => Promise<void>;
  
  setCurrentHikeDiscoveries: (discoveries: Discovery[]) => void;
  addCapturedDiscovery: (captured: CapturedDiscovery) => void;
  addBadge: (badge: Badge) => void;
  
  clearCurrentHikeData: () => void;
  syncCurrentHikeToHistory: () => Promise<void>;
  
  // Queries
  hasBeenCaptured: (discoveryId: string) => boolean;
  getBadgesByType: (type: string) => Badge[];
}

const STORAGE_KEY_DISCOVERIES = '@ecotrails/captured_discoveries';
const STORAGE_KEY_BADGES = '@ecotrails/badges';

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  allCapturedDiscoveries: [],
  allBadges: [],
  currentHikeDiscoveries: [],
  currentHikeCaptured: [],
  currentHikeBadges: [],
  totalDiscoveries: 0,
  totalBadges: 0,
  
  loadPersistedData: async () => {
    try {
      const [discoveriesJson, badgesJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_DISCOVERIES),
        AsyncStorage.getItem(STORAGE_KEY_BADGES),
      ]);
      
      const discoveries: CapturedDiscovery[] = discoveriesJson ? JSON.parse(discoveriesJson) : [];
      const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
      
      set({
        allCapturedDiscoveries: discoveries,
        allBadges: badges,
        totalDiscoveries: discoveries.length,
        totalBadges: badges.length,
      });
    } catch (error) {
      console.error('[DiscoveryStore] Failed to load persisted data:', error);
    }
  },
  
  persistData: async () => {
    try {
      const { allCapturedDiscoveries, allBadges } = get();
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_DISCOVERIES, JSON.stringify(allCapturedDiscoveries)),
        AsyncStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(allBadges)),
      ]);
    } catch (error) {
      console.error('[DiscoveryStore] Failed to persist data:', error);
    }
  },
  
  setCurrentHikeDiscoveries: (discoveries) => {
    set({ currentHikeDiscoveries: discoveries });
  },
  
  addCapturedDiscovery: (captured) => {
    set((state) => ({
      currentHikeCaptured: [...state.currentHikeCaptured, captured],
    }));
  },
  
  addBadge: (badge) => {
    set((state) => ({
      currentHikeBadges: [...state.currentHikeBadges, badge],
    }));
  },
  
  clearCurrentHikeData: () => {
    set({
      currentHikeDiscoveries: [],
      currentHikeCaptured: [],
      currentHikeBadges: [],
    });
  },
  
  syncCurrentHikeToHistory: async () => {
    const { currentHikeCaptured, currentHikeBadges, allCapturedDiscoveries, allBadges } = get();
    
    // Merge current hike data with history
    const newDiscoveries = [...allCapturedDiscoveries, ...currentHikeCaptured];
    const newBadges = [...allBadges, ...currentHikeBadges];
    
    set({
      allCapturedDiscoveries: newDiscoveries,
      allBadges: newBadges,
      totalDiscoveries: newDiscoveries.length,
      totalBadges: newBadges.length,
    });
    
    // Persist
    await get().persistData();
    
    // Clear current hike
    get().clearCurrentHikeData();
  },
  
  hasBeenCaptured: (discoveryId) => {
    const { allCapturedDiscoveries, currentHikeCaptured } = get();
    return (
      allCapturedDiscoveries.some((d) => d.discoveryId === discoveryId) ||
      currentHikeCaptured.some((d) => d.discoveryId === discoveryId)
    );
  },
  
  getBadgesByType: (type) => {
    const { allBadges, currentHikeBadges } = get();
    return [...allBadges, ...currentHikeBadges].filter((b) => b.type === type);
  },
}));
