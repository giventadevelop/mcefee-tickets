// This file was renamed from actions.ts to ApiServerActions.ts as a standard for server-side API calls in this module.
"use server";
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  return await res.json();
}

export async function patchUserProfileServer(userId: number, payload: any) {
  let token = await getCachedApiJwt();
  let res = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, tenantId: getTenantId() }),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, tenantId: getTenantId() }),
    });
  }
  return await res.json();
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