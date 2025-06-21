// This file was renamed from actions.ts to ApiServerActions.ts as a standard for server-side API calls in this module.
"use server";
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';
import { UserProfileDTO } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchWithJwt(url: string, options: any = {}) {
  const { getCachedApiJwt, generateApiJwt } = await import('@/lib/api/jwt');
  let token = await getCachedApiJwt();
  let res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });

  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  }
  return res;
}

export async function fetchAllUsersServer(): Promise<UserProfileDTO[]> {
  const url = `${API_BASE_URL}/api/user-profiles?tenantId.equals=${getTenantId()}`;
  const res = await fetchWithJwt(url, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAdminProfileServer(userId: string): Promise<UserProfileDTO | null> {
    if (!userId) return null;
    const url = `${API_BASE_URL}/api/user-profiles/by-user/${userId}?tenantId.equals=${getTenantId()}`;
    const res = await fetchWithJwt(url, { cache: 'no-store' });
    if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data[0] : data;
    }
    return null;
}

export async function fetchUsersServer({ search, searchField, status, role, page, pageSize }: {
  search: string;
  searchField: string;
  status: string;
  role: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  if (search && searchField) {
    params.append(`${searchField}.contains`, search);
  }
  if (status) params.append('userStatus.equals', status);
  if (role) params.append('userRole.equals', role);
  params.append('page', String(page - 1));
  params.append('size', String(pageSize));
  params.append('tenantId.equals', getTenantId());
  let token = await getCachedApiJwt();
  let res = await fetch(`${API_BASE_URL}/api/user-profiles?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(`${API_BASE_URL}/api/user-profiles?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    });
  }
  const totalCount = res.headers.get('X-Total-Count');
  const data = await res.json();
  return { data, totalCount: totalCount ? parseInt(totalCount, 10) : 0 };
}

export async function patchUserProfileServer(userId: number, payload: Partial<UserProfileDTO>) {
  const url = `${API_BASE_URL}/api/user-profiles/${userId}`;
  const res = await fetchWithJwt(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to update user profile');
  }
  return res.json();
}

export async function bulkUploadUsersServer(users: any[]) {
  let token = await getCachedApiJwt();
  let res = await fetch(`${API_BASE_URL}/api/user-profiles/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(users.map(u => ({ ...u, tenantId: getTenantId() }))),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(`${API_BASE_URL}/api/user-profiles/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(users.map(u => ({ ...u, tenantId: getTenantId() }))),
    });
  }
  return await res.json();
}