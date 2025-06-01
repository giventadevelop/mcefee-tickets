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