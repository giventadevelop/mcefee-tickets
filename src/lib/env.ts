/**
 * Lazily loads API JWT user from environment variables, supporting AMPLIFY_ and unprefixed names.
 */
export function getApiJwtUser() {
  return (
    process.env.AMPLIFY_API_JWT_USER ||
    process.env.API_JWT_USER ||
    process.env.NEXT_PUBLIC_API_JWT_USER
  );
}

/**
 * Lazily loads API JWT password from environment variables, supporting AMPLIFY_ and unprefixed names.
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
 * Get the email host URL prefix for QR code generation
 * This is used to ensure QR codes work properly in email contexts
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://mcefee.org")
 */
export function getEmailHostUrlPrefix(): string {
  // In production, use the actual domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://mcefee.org';
  }
  // In development, use localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}