import { NextRequest, NextResponse } from 'next/server';
import { IntegrationProvider, ConnectResponse } from '@/lib/integrations/types';

/**
 * POST /api/integrations/{provider}/connect
 * Initiates OAuth flow for supported providers or returns error for unsupported
 */

// OAuth configuration (would be in env vars in production)
const OAUTH_CONFIG = {
  garmin: {
    clientId: process.env.GARMIN_CLIENT_ID || 'demo-garmin-client',
    authUrl: 'https://connect.garmin.com/oauthConfirm',
    scope: 'activity:read heartrate:read',
  },
  strava: {
    clientId: process.env.STRAVA_CLIENT_ID || 'demo-strava-client',
    authUrl: 'https://www.strava.com/oauth/authorize',
    scope: 'read,activity:read',
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider as IntegrationProvider;

    // Apple Health requires mobile app
    if (provider === 'apple_health') {
      return NextResponse.json<ConnectResponse>({
        success: false,
        error: 'Apple Health requires the iOS mobile app',
      });
    }

    // Generate OAuth URL for supported providers
    if (provider === 'garmin' || provider === 'strava') {
      const config = OAUTH_CONFIG[provider];
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const redirectUri = `${baseUrl}/api/integrations/${provider}/callback`;
      
      // In production, generate and store a state parameter for CSRF protection
      const state = `${Date.now()}-demo-state`;
      
      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', config.scope);
      authUrl.searchParams.set('state', state);
      
      if (provider === 'strava') {
        authUrl.searchParams.set('approval_prompt', 'auto');
      }

      return NextResponse.json<ConnectResponse>({
        success: true,
        redirectUrl: authUrl.toString(),
      });
    }

    return NextResponse.json<ConnectResponse>(
      {
        success: false,
        error: 'Unsupported provider',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error connecting integration:', error);
    return NextResponse.json<ConnectResponse>(
      {
        success: false,
        error: 'Failed to initiate connection',
      },
      { status: 500 }
    );
  }
}
