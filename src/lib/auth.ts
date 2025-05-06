import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function authenticatedRequest(
  req: NextRequest,
  handler: (userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Initialize auth at runtime
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return await handler(userId);
  } catch (error) {
    console.error('Authentication error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function getServerAuth() {
  // First await headers
  await headers();
  // Then get auth
  const session = await auth();
  return session;
}

export async function getUserAuth() {
  const { userId, sessionClaims } = await getServerAuth();
  return {
    session: {
      user: {
        id: userId,
        ...sessionClaims,
      },
    },
  };
}