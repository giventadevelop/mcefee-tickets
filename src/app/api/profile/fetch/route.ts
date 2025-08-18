import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchUserProfileServer } from '@/app/profile/ApiServerActions';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to fetch user profile data
 * Used by client components that need loading states
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from request body (for verification)
    const body = await request.json();
    const requestedUserId = body.userId;

    // Ensure user can only fetch their own profile
    if (userId !== requestedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch profile using existing server action
    const profile = await fetchUserProfileServer(userId);

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[PROFILE-FETCH-API] Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}