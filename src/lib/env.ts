/**
 * Lazily loads API JWT user from environment variables, prioritizing AMPLIFY_ prefix for AWS Amplify.
 */
export function getApiJwtUser() {
  return (
    process.env.AMPLIFY_API_JWT_USER ||
    process.env.API_JWT_USER ||
    process.env.NEXT_PUBLIC_API_JWT_USER
  );
}

/**
 * Lazily loads API JWT password from environment variables, prioritizing AMPLIFY_ prefix for AWS Amplify.
 */
export function getApiJwtPass() {
  return (
    process.env.AMPLIFY_API_JWT_PASS ||
    process.env.API_JWT_PASS ||
    process.env.NEXT_PUBLIC_API_JWT_PASS
  );
}

/**
 * Lazily loads tenant ID from environment variables (NEXT_PUBLIC_TENANT_ID).
 * Throws an error if not set.
 */
export function getTenantId() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  if (!tenantId) {
    throw new Error('NEXT_PUBLIC_TENANT_ID is not set in environment variables');
  }
  return tenantId;
}

/**
 * Get the app URL for port-agnostic configuration
 * This is used for server-side API calls to ensure the application works on any port
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://mcefee.org")
 *
 * IMPORTANT: This function should NOT have hardcoded fallbacks. The actual host should be
 * determined from the request context or environment variables to avoid hardcoding issues.
 */
export function getAppUrl(): string {
  // In production, use the actual domain from environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }
  // In development, use localhost with dynamic port detection
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get the email host URL prefix for QR code generation
 * This is used to ensure QR codes work properly in email contexts
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://mcefee.org")
 *
 * IMPORTANT: This function should NOT have hardcoded fallbacks. The actual host should be
 * determined from the request context or environment variables to avoid hardcoding issues.
 */
export function getEmailHostUrlPrefix(): string {
  // In production, use the actual domain from environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }
  // In development, use localhost with dynamic port detection
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}