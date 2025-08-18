/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,

  // Enable image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eventapp-media-bucket.s3.us-east-2.amazonaws.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },

  // Configure environment variables
  serverRuntimeConfig: {
    // Will only be available on the server side
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || process.env.AMPLIFY_STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || process.env.AMPLIFY_STRIPE_WEBHOOK_SECRET,
  },

  publicRuntimeConfig: {
    // Will be available on both server and client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.AMPLIFY_NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.AMPLIFY_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },

  // Enable SWC minification for improved performance
  // swcMinify: true,

  // Customize webpack config if needed
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack config here if needed
    return config;
  },

  // Configure redirects if needed
  async redirects() {
    return [];
  },

  // Configure rewrites if needed
  async rewrites() {
    return [];
  },

  // Configure headers if needed
  async headers() {
    return [];
  },

  // Enable experimental features if needed
  experimental: {
    // Add experimental features here
  },

  env: {
    // Clerk environment variables
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,

    // API JWT credentials (prioritize AMPLIFY_ prefix for AWS Amplify)
    API_JWT_USER: process.env.AMPLIFY_API_JWT_USER || process.env.API_JWT_USER,
    API_JWT_PASS: process.env.AMPLIFY_API_JWT_PASS || process.env.API_JWT_PASS,
    AMPLIFY_API_JWT_USER: process.env.AMPLIFY_API_JWT_USER,
    AMPLIFY_API_JWT_PASS: process.env.AMPLIFY_API_JWT_PASS,
    NEXT_PUBLIC_API_JWT_USER: process.env.NEXT_PUBLIC_API_JWT_USER,
    NEXT_PUBLIC_API_JWT_PASS: process.env.NEXT_PUBLIC_API_JWT_PASS,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_TENANT_ID: process.env.NEXT_PUBLIC_TENANT_ID,

    // Stripe environment variables
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    NEXT_PUBLIC_STRIPE_MAX_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_MAX_PRICE_ID,
    NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID,
  },
};

export default nextConfig;

