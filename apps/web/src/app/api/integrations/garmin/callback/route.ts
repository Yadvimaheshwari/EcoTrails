import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/integrations/garmin/callback
 * OAuth callback handler for Garmin Connect
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
      console.error('Garmin OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_error=garmin_denied`
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
    // In production, make actual API call to Garmin Connect
    const mockTokenResponse = {
      access_token: `garmin_mock_${Date.now()}`,
      refresh_token: `garmin_refresh_${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
    };

    // TODO: Get actual user ID from session
    const userId = 'demo-user';
    const tokenKey = `${userId}:garmin`;

    // Store tokens
    tokenStore.set(tokenKey, {
      provider: 'garmin',
      accessToken: mockTokenResponse.access_token,
      refreshToken: mockTokenResponse.refresh_token,
      expiresAt: Date.now() + mockTokenResponse.expires_in * 1000,
      connectedAt: new Date().toISOString(),
    });

    console.log('Garmin connected successfully for user:', userId);

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_success=garmin`
    );
  } catch (error) {
    console.error('Error in Garmin callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?integration_error=garmin_failed`
    );
  }
}
