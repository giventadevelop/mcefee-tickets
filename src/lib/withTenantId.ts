import { getTenantId } from '@/lib/env';

/**
 * Returns a new DTO object with tenantId injected.
 * Does not mutate the original object.
 *
 * @param dto - The DTO object to augment
 * @returns The DTO with tenantId set
 */
export function withTenantId<T extends object>(dto: T): T & { tenantId: string } {
  return {
    ...dto,
    tenantId: getTenantId(),
  };
}