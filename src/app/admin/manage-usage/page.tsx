import { auth } from '@clerk/nextjs';
import ManageUsageClient from './ManageUsageClient';
import { getTenantId } from '@/lib/env';
import type { UserProfileDTO } from '@/types';

// Server-side function to fetch admin profile
async function fetchAdminProfileServer(userId: string): Promise<UserProfileDTO | null> {
  if (!userId) return null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/proxy/user-profiles/by-user/${userId}?tenantId.equals=${getTenantId()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (res.ok) {
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  }
  return null;
}

export default async function ManageUsagePage() {
  const { userId } = auth();
  const adminProfile = userId ? await fetchAdminProfileServer(userId) : null;
  return <ManageUsageClient adminProfile={adminProfile} />;
}