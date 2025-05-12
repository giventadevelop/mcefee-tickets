import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes that require authentication
// Commented out since currently unused, but kept for future reference
// const protectedPaths = [
//   '/dashboard(.*)',
//   '/tasks(.*)',
//   '/profile(.*)',
// ];

// Define public routes that don't require authentication
const publicPaths = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/event(.*)',     // Make event pages public
  '/api/webhooks(.*)', // Keep webhooks public
  '/api/stripe/event-checkout', // Make event checkout public
  '/api/proxy/user-tasks(.*)', // Allow user-tasks proxy to be public
];

// Initialize Clerk middleware with proper error handling
const initClerkMiddleware = () => {
  try {
    // Only check env vars in production runtime
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'build') {
      const requiredEnvVars = [
        'CLERK_SECRET_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL'
      ];

      const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

      if (missingEnvVars.length > 0) {
        console.error('Missing required Clerk environment variables:', missingEnvVars);
      }
    }

    console.log('CLERK_SECRET_KEY:', !!process.env.CLERK_SECRET_KEY);

    return authMiddleware({
      publicRoutes: publicPaths,
      ignoredRoutes: [
        '/api/webhooks/stripe',
        '/api/webhooks/clerk',
      ],
      // Add debug mode in development
      debug: process.env.NODE_ENV === 'development',
      // Handle initialization errors gracefully
      afterAuth: (auth, req) => {
        // Skip auth check during build
        if (process.env.NEXT_PHASE === 'build') {
          return NextResponse.next();
        }

        if (!auth.userId && !publicPaths.some(path => req.nextUrl.pathname.match(path))) {
          return NextResponse.redirect(new URL('/sign-in', req.url));
        }
        return NextResponse.next();
      },
    });
  } catch (error) {
    console.error('Failed to initialize Clerk middleware:', error);
    // Return a passthrough middleware that doesn't block requests
    return (request: NextRequest) => NextResponse.next();
  }
};

export default initClerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.[\\w]+$|_next).*)',
    // Optional: Protect API routes
    '/(api|trpc)(.*)',
  ],
};