import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/integrations/strava/callback
 * OAuth callback handler for Strava
 */

// Mark as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

// In-memory token store (in production, use database)
const tokenStore = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('Strava OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_error=strava_denied`
      );
    }

    // Validate code
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_error=missing_code`
      );
    }

    // TODO: Validate state parameter for CSRF protection

    // Exchange code for access token
    // In production, make actual API call to Strava
    const mockTokenResponse = {
      access_token: `strava_mock_${Date.now()}`,
      refresh_token: `strava_refresh_${Date.now()}`,
      expires_at: Date.now() + 21600000, // 6 hours
      athlete: {
        id: 12345,
        firstname: 'Demo',
        lastname: 'User',
      },
    };

    // TODO: Get actual user ID from session
    const userId = 'demo-user';
    const tokenKey = `${userId}:strava`;

    // Store tokens
    tokenStore.set(tokenKey, {
      provider: 'strava',
      accessToken: mockTokenResponse.access_token,
      refreshToken: mockTokenResponse.refresh_token,
      expiresAt: mockTokenResponse.expires_at,
      athleteId: mockTokenResponse.athlete.id,
      connectedAt: new Date().toISOString(),
    });

    console.log('Strava connected successfully for user:', userId);

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_success=strava`
    );
  } catch (error) {
    console.error('Error in Strava callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_error=strava_failed`
    );
  }
}
