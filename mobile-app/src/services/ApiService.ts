/**
 * API Service Layer
 * Centralized API calls for parks, trails, and hike sessions
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { US_PARKS, Park, searchParks } from '../data/parks';

// Types
export interface Trail {
  id: string;
  park_id: string;
  name: string;
  description?: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  length_miles: number;
  length_km: number;
  elevation_gain_ft: number;
  elevation_gain_m: number;
  estimated_duration_hours: number;
  route_type: 'out-and-back' | 'loop' | 'point-to-point';
  coordinates: { lat: number; lng: number };
  trailhead_location?: { lat: number; lng: number; name: string };
  waypoints?: Array<{ lat: number; lng: number; name: string; description?: string }>;
  features?: string[];
  best_season?: string[];
  permit_required?: boolean;
  dog_friendly?: boolean;
  rating?: number;
  review_count?: number;
}

export interface ParkDetail extends Park {
  boundary?: Array<{ lat: number; lng: number }>; // Park boundary polygon
  trails?: Trail[];
  website_url?: string;
  entrance_fee?: { amount: number; description: string };
  operating_hours?: { open: string; close: string; timezone: string };
}

export interface HikeSession {
  id: string;
  user_id: string;
  trail_id?: string;
  park_id: string;
  park_name: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  distance_miles?: number;
  duration_minutes?: number;
  created_at: string;
}

export interface CreateHikeSessionRequest {
  user_id: string;
  trail_id: string;
  park_id: string;
  park_name: string;
}

export interface EndHikeSessionRequest {
  distance_miles: number;
  duration_minutes: number;
  route_path?: Array<{ lat: number; lng: number; timestamp: string }>;
}

class ApiService {
  // Parks API
  async getParks(searchQuery?: string, state?: string, type?: Park['type']): Promise<Park[]> {
    try {
      // For now, use local data. In future, replace with API call:
      // const response = await axios.get(`${API_BASE_URL}/api/v1/parks`, { params: { search, state, type } });
      // return response.data;
      
      let parks = US_PARKS;
      
      if (searchQuery) {
        parks = searchParks(searchQuery);
      }
      
      if (state) {
        parks = parks.filter(p => p.state === state || (p.states && p.states.includes(state)));
      }
      
      if (type) {
        parks = parks.filter(p => p.type === type);
      }
      
      return parks;
    } catch (error) {
      console.error('Error fetching parks:', error);
      throw error;
    }
  }

  async getParkDetail(parkId: string): Promise<ParkDetail> {
    try {
      // For now, use local data. In future, replace with API call:
      // const response = await axios.get(`${API_BASE_URL}/api/v1/parks/${parkId}`);
      // return response.data;
      
      const park = US_PARKS.find(p => p.id === parkId);
      if (!park) {
        throw new Error(`Park not found: ${parkId}`);
      }

      // Generate mock trails for the park
      const trails = this.generateMockTrailsForPark(parkId, park.name);
      
      // Generate mock boundary (simple rectangle around coordinates)
      const boundary = this.generateParkBoundary(park.coordinates);

      return {
        ...park,
        boundary,
        trails,
      };
    } catch (error) {
      console.error('Error fetching park detail:', error);
      throw error;
    }
  }

  // Trails API
  async getTrailsByPark(parkId: string): Promise<Trail[]> {
    try {
      // For now, use mock data. In future, replace with API call:
      // const response = await axios.get(`${API_BASE_URL}/api/v1/parks/${parkId}/trails`);
      // return response.data;
      
      const park = US_PARKS.find(p => p.id === parkId);
      if (!park) {
        return [];
      }

      return this.generateMockTrailsForPark(parkId, park.name);
    } catch (error) {
      console.error('Error fetching trails:', error);
      throw error;
    }
  }

  async getTrailDetail(trailId: string): Promise<Trail> {
    try {
      // For now, use mock data. In future, replace with API call:
      // const response = await axios.get(`${API_BASE_URL}/api/v1/trails/${trailId}`);
      // return response.data;
      
      // Extract park_id from trailId (format: trail-{parkId}-{index})
      // Handle park IDs that may contain hyphens (e.g., "dry-tortugas")
      // Parse from the end: last segment is index, everything between "trail-" and last segment is parkId
      if (!trailId.startsWith('trail-')) {
        throw new Error(`Invalid trail ID format: ${trailId}. Must start with 'trail-'`);
      }
      
      const withoutPrefix = trailId.substring(6); // Remove "trail-"
      const lastDashIndex = withoutPrefix.lastIndexOf('-');
      
      if (lastDashIndex === -1) {
        throw new Error(`Invalid trail ID format: ${trailId}. Missing index segment`);
      }
      
      const parkId = withoutPrefix.substring(0, lastDashIndex);
      const indexStr = withoutPrefix.substring(lastDashIndex + 1);
      
      // Validate index is a number
      const index = parseInt(indexStr, 10);
      if (isNaN(index)) {
        throw new Error(`Invalid trail ID format: ${trailId}. Index must be a number`);
      }
      
      // Validate park_id is not empty
      if (!parkId || parkId.length === 0) {
        throw new Error(`Invalid trail ID format: ${trailId}. Park ID is empty`);
      }
      
      const trails = await this.getTrailsByPark(parkId);
      const trail = trails.find(t => t.id === trailId);
      
      if (!trail) {
        throw new Error(`Trail not found: ${trailId} in park ${parkId}`);
      }
      
      // Defensive check: ensure trail has required fields
      if (!trail.park_id) {
        throw new Error(`Trail ${trailId} is missing park_id`);
      }
      
      return trail;
    } catch (error) {
      console.error('Error fetching trail detail:', error);
      throw error;
    }
  }

  // Hike Sessions API
  async createHikeSession(request: CreateHikeSessionRequest): Promise<HikeSession> {
    try {
      // Validate required fields
      if (!request.trail_id || !request.park_id || !request.park_name) {
        throw new Error('Missing required fields: trail_id, park_id, and park_name are required');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/sessions`,
        {
          park_name: request.park_name,
          trail_id: request.trail_id,
          park_id: request.park_id,
          user_id: request.user_id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.session_id,
        user_id: request.user_id,
        trail_id: request.trail_id,
        park_id: request.park_id,
        park_name: request.park_name,
        start_time: new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Error creating hike session:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create hike session';
      throw new Error(errorMessage);
    }
  }

  async endHikeSession(sessionId: string, data: EndHikeSessionRequest): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/sessions/${sessionId}/end`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      console.error('Error ending hike session:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to end hike session';
      throw new Error(errorMessage);
    }
  }

  async getHikeSession(sessionId: string): Promise<HikeSession> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching hike session:', error);
      throw error;
    }
  }

  // Helper: Generate mock trails for a park
  private generateMockTrailsForPark(parkId: string, parkName: string): Trail[] {
    const difficulties: Trail['difficulty'][] = ['easy', 'moderate', 'hard', 'expert'];
    const routeTypes: Trail['route_type'][] = ['out-and-back', 'loop', 'point-to-point'];
    const trailNames = [
      `${parkName} Main Trail`,
      `${parkName} Summit Trail`,
      `${parkName} Loop Trail`,
      `${parkName} Waterfall Trail`,
      `${parkName} Scenic Overlook`,
    ];

    return trailNames.slice(0, 3 + Math.floor(Math.random() * 2)).map((name, index) => {
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      const length_miles = 2 + Math.random() * 10;
      const elevation_gain_ft = 200 + Math.random() * 3000;
      
      return {
        id: `trail-${parkId}-${index}`,
        park_id: parkId,
        name,
        description: `A beautiful trail in ${parkName} with scenic views and diverse terrain.`,
        difficulty,
        length_miles: Math.round(length_miles * 10) / 10,
        length_km: Math.round(length_miles * 1.60934 * 10) / 10,
        elevation_gain_ft: Math.round(elevation_gain_ft),
        elevation_gain_m: Math.round(elevation_gain_ft * 0.3048),
        estimated_duration_hours: Math.round((length_miles / 2.5) * 10) / 10,
        route_type: routeTypes[Math.floor(Math.random() * routeTypes.length)],
        coordinates: {
          lat: 37.7749 + (Math.random() - 0.5) * 0.1,
          lng: -122.4194 + (Math.random() - 0.5) * 0.1,
        },
        features: ['Scenic Views', 'Wildlife', 'Water Features'],
        best_season: ['Spring', 'Summer', 'Fall'],
        permit_required: Math.random() > 0.7,
        dog_friendly: Math.random() > 0.3,
        rating: 4 + Math.random(),
        review_count: Math.floor(Math.random() * 500) + 50,
      };
    });
  }

  // Helper: Generate simple park boundary (rectangle)
  private generateParkBoundary(center: { lat: number; lng: number }): Array<{ lat: number; lng: number }> {
    const offset = 0.05; // ~5km
    return [
      { lat: center.lat - offset, lng: center.lng - offset },
      { lat: center.lat - offset, lng: center.lng + offset },
      { lat: center.lat + offset, lng: center.lng + offset },
      { lat: center.lat + offset, lng: center.lng - offset },
      { lat: center.lat - offset, lng: center.lng - offset }, // Close polygon
    ];
  }
}

export default new ApiService();
