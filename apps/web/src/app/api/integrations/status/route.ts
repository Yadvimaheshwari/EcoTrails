import { NextRequest, NextResponse } from 'next/server';
import { IntegrationStatusResponse } from '@/lib/integrations/types';

/**
 * GET /api/integrations/status
 * Returns the user's integration statuses and preferences
 * 
 * TODO: Replace with real database queries once backend is integrated
 */

// In-memory store for demo purposes
// In production, this would query the database by user ID
const mockIntegrationStore = new Map<string, IntegrationStatusResponse>();

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from auth session
    const userId = 'demo-user';

    // Get or create user integrations
    let userIntegrations = mockIntegrationStore.get(userId);
    
    if (!userIntegrations) {
      // Initialize with default values
      userIntegrations = {
        statuses: [
          { provider: 'apple_health', connected: false },
          { provider: 'garmin', connected: false },
          { provider: 'strava', connected: false },
        ],
        preferences: {
          apple_health: {
            importLast30Days: true,
            autoSyncAfterHike: true,
          },
          garmin: {
            importLast30Days: true,
            autoSyncAfterHike: true,
          },
          strava: {
            importLast30Days: true,
            autoSyncAfterHike: false,
          },
        },
      };
      mockIntegrationStore.set(userId, userIntegrations);
    }

    return NextResponse.json(userIntegrations);
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration status' },
      { status: 500 }
    );
  }
}
