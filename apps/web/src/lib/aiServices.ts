import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Nano Banana Pro - Image Enhancement
export interface PhotoEnhancementOptions {
  lighting?: 'golden-hour' | 'dramatic' | 'soft' | 'vibrant';
  style?: 'natural' | 'cinematic' | 'vintage' | 'modern';
  enhance_subject?: boolean;
  remove_shadows?: boolean;
  background_replacement?: boolean;
}

export async function enhancePhotoWithNanoBanana(
  photoFile: File,
  options: PhotoEnhancementOptions = {}
): Promise<{ enhanced_url: string; original_url: string }> {
  const formData = new FormData();
  formData.append('image', photoFile);
  formData.append('options', JSON.stringify(options));

  const response = await axios.post(
    `${API_BASE_URL}/api/v1/ai/enhance-photo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      timeout: 30000,
    }
  );

  return response.data;
}

// Veo - Video Generation
export interface VideoGenerationOptions {
  style?: 'cinematic' | 'documentary' | 'adventure' | 'peaceful';
  duration?: number; // seconds
  music_tempo?: 'slow' | 'medium' | 'fast';
  include_narration?: boolean;
  include_stats_overlay?: boolean;
}

export async function generateTrailVideo(
  hikeId: string,
  options: VideoGenerationOptions = {}
): Promise<{ video_url: string; thumbnail_url: string; duration: number }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/hikes/${hikeId}/generate-video`,
    options,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      timeout: 60000, // Video generation takes longer
    }
  );

  return response.data;
}

// Gemini 3 Pro - Auto Storytelling
export async function generateHikeStory(
  hikeId: string,
  style: 'narrative' | 'poetic' | 'adventure' | 'reflective' = 'narrative'
): Promise<{
  story: string;
  highlights: string[];
  emotional_journey: Array<{ time: string; emotion: string; description: string }>;
  key_moments: Array<{ time: string; moment: string; significance: string }>;
}> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/hikes/${hikeId}/generate-story`,
      { style },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        timeout: 30000,
      }
    );
    return response.data;
  } catch (error) {
    console.warn('[AI] Story generation failed, using fallback', error);
    // Return fallback story
    return {
      story: "Your amazing hike adventure! 🥾✨\n\nThis feature is currently being enhanced with AI capabilities powered by Gemini 3 Pro. Soon, you'll receive personalized storytelling based on your hike data, photos, and discoveries.\n\nYour journey will be transformed into a captivating narrative that captures the essence of your experience.",
      highlights: ['Feature coming soon', 'AI-powered storytelling', 'Personalized narratives'],
      emotional_journey: [],
      key_moments: []
    };
  }
}

// Smart Photo Organization
export async function organizePhotos(
  hikeId: string
): Promise<{
  albums: Array<{
    name: string;
    photos: string[];
    theme: string;
    location?: { lat: number; lng: number };
  }>;
  tags: Array<{ tag: string; photos: string[] }>;
  highlights: string[]; // Photo IDs
  message?: string;
}> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/hikes/${hikeId}/organize-photos`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    console.warn('[AI] Photo organization failed, using fallback', error);
    return {
      albums: [],
      tags: [],
      highlights: [],
      message: "Photo organization feature coming soon! 📸\n\nWe'll automatically tag your photos by location, wildlife spotted, time of day, and create beautiful albums organized by theme."
    };
  }
}

// Predictive Insights
export async function getPredictiveInsights(
  userId: string
): Promise<{
  patterns: Array<{ pattern: string; confidence: number; explanation: string }>;
  recommendations: Array<{ trail_id: string; reason: string; match_score: number }>;
  progress_predictions: Array<{ achievement: string; progress: number; estimated_completion: string }>;
  skill_development: { current_level: string; next_milestone: string; progress_percentage: number };
}> {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/users/${userId}/insights`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      timeout: 15000,
    }
  );

  return response.data;
}

// Wrapper for video generation (for journal page)
export async function createTrailVideo(hikeId: string): Promise<{ video_url?: string; message?: string }> {
  try {
    const result = await generateTrailVideo(hikeId, { style: 'cinematic', duration: 30 });
    return result;
  } catch (error) {
    console.warn('[AI] Video creation failed, using fallback', error);
    return {
      message: "Trail video creation feature in development! 🎥\n\nSoon you'll be able to create cinematic recaps with your photos, route animation, elevation changes, and personalized soundtrack powered by Veo AI."
    };
  }
}

// Export Journal Entry as PDF
export async function exportJournalEntry(hikeId: string): Promise<Blob> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/hikes/${hikeId}/export`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        responseType: 'blob',
        timeout: 15000,
      }
    );
    return response.data;
  } catch (error) {
    console.warn('[Export] Failed to export journal entry, creating fallback', error);
    // Create a simple text file as fallback
    const text = `EcoTrails Hike Journal Entry

Hike ID: ${hikeId}
Exported: ${new Date().toLocaleString()}

Export feature is being enhanced with PDF generation, stats visualization, and photo galleries.

Check back soon for a beautifully formatted journal export!
`;
    return new Blob([text], { type: 'text/plain' });
  }
}

// Natural Language Search
export async function searchJournal(
  query: string,
  filters?: {
    date_range?: { start: string; end: string };
    location?: string;
    difficulty?: string;
  }
): Promise<{
  results: Array<{
    hike_id: string;
    relevance_score: number;
    matched_snippets: string[];
    highlights: string[];
  }>;
  suggestions: string[];
}> {
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/journal/search`,
    { query, filters },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      timeout: 10000,
    }
  );

  return response.data;
}
