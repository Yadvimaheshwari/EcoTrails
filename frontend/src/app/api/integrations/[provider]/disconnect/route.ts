import { NextRequest, NextResponse } from 'next/server';
import { IntegrationProvider, DisconnectResponse } from '@/lib/integrations/types';

/**
 * POST /api/integrations/{provider}/disconnect
 * Disconnects an integration and removes stored tokens
 */

// In-memory token store (in production, use database)
const tokenStore = new Map<string, any>();

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider as IntegrationProvider;
    
    // TODO: Get user ID from auth session
    const userId = 'demo-user';
    const tokenKey = `${userId}:${provider}`;

    // Remove stored tokens
    tokenStore.delete(tokenKey);

    // In production, also:
    // 1. Revoke OAuth tokens with provider
    // 2. Update database to mark as disconnected
    // 3. Clear any cached data

    return NextResponse.json<DisconnectResponse>({
      success: true,
    });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    return NextResponse.json<DisconnectResponse>(
      {
        success: false,
        error: 'Failed to disconnect integration',
      },
      { status: 500 }
    );
  }
}
